/**
 * KakaoTalk Export & Raw Chat Text Parser for Life-OS
 * Automatically extracts bank accounts, addresses, financial spendings, phone numbers, and memos.
 */

export interface ParsedKakaoItem {
  id: string;
  type: "account" | "finance" | "address" | "phone" | "memo";
  title: string;
  value: string;
  category: string;
  timestamp?: string;
  sender?: string;
  targetModule: "quickcopy" | "finance" | "diary";
  memo?: string;
}

const KOREAN_BANKS = [
  "국민", "KB", "신한", "우리", "하나", "농협", "NH", "기업", "IBK",
  "카카오뱅크", "카뱅", "토스뱅크", "토스", "케이뱅크", "SC제일", "씨티",
  "우체국", "새마을", "신협", "수협", "대구", "부산", "광주", "제주", "전북", "경남"
];

export function parseKakaoChatText(rawText: string): ParsedKakaoItem[] {
  if (!rawText || !rawText.trim()) return [];

  const results: ParsedKakaoItem[] = [];
  const lines = rawText.split(/\r?\n/);

  // Regex patterns
  // Bank Account pattern: e.g., "국민 123-456-789012" or "3333-01-1234567 카카오뱅크"
  const accountRegex = new RegExp(
    `(${KOREAN_BANKS.join("|")})?\\s*([0-9]{2,6}[-\\s][0-9]{2,6}[-\\s][0-9]{2,8}(?:[-\\s][0-9]{1,4})?)\\s*(${KOREAN_BANKS.join("|")})?`,
    "gi"
  );

  // Expense / Money pattern: e.g., "15,000원", "3만원", "결제 45,000원", "이체 50000원"
  const amountRegex = /([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*(?:원|만원)/g;

  // Phone number: e.g., 010-1234-5678 or 01012345678
  const phoneRegex = /(01[016789])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g;

  // Address pattern: Korean road name address or jibun
  const addressRegex = /([가-힣]+(?:시|도)\s+[가-힣]+(?:구|군|시)\s+[가-힣0-9\s-]+(?:로|길|동|읍|면|리)\s*[0-9]+(?:번지|길|로)?(?:\s+[가-힣0-9\s-]+(?:아파트|빌딩|타워|호|층|동))?)/g;

  // Kakao standard header: [Sender] [Time] Message
  const kakaoHeaderRegex = /^\[([^\]]+)\]\s+\[([^\]]+)\]\s+(.*)$/;

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let sender = "";
    let timeStr = "";
    let content = trimmed;

    const headerMatch = trimmed.match(kakaoHeaderRegex);
    if (headerMatch) {
      sender = headerMatch[1];
      timeStr = headerMatch[2];
      content = headerMatch[3];
    }

    // 1. Check Bank Accounts
    accountRegex.lastIndex = 0;
    let accMatch;
    while ((accMatch = accountRegex.exec(content)) !== null) {
      const bank1 = accMatch[1];
      const accNum = accMatch[2].trim();
      const bank2 = accMatch[3];
      const bankName = bank1 || bank2 || "계좌";

      // Exclude simple phone numbers or dates misidentified as account
      if (accNum.length >= 9 && !accNum.startsWith("010")) {
        results.push({
          id: `kakao-acc-${lineIdx}-${results.length}`,
          type: "account",
          title: `${bankName} 계좌번호`,
          value: `${bankName} ${accNum}`,
          category: "금융",
          timestamp: timeStr,
          sender,
          targetModule: "quickcopy",
          memo: `카톡 [${sender || "대화"}]에서 자동 추출: "${content}"`,
        });
      }
    }

    // 2. Check Addresses
    addressRegex.lastIndex = 0;
    let addrMatch;
    while ((addrMatch = addressRegex.exec(content)) !== null) {
      const addr = addrMatch[1].trim();
      if (addr.length >= 8) {
        results.push({
          id: `kakao-addr-${lineIdx}-${results.length}`,
          type: "address",
          title: "배송/방문 주소",
          value: addr,
          category: "일상",
          timestamp: timeStr,
          sender,
          targetModule: "quickcopy",
          memo: `카톡 [${sender || "대화"}] 공유 주소: "${content}"`,
        });
      }
    }

    // 3. Check Phone Numbers
    phoneRegex.lastIndex = 0;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(content)) !== null) {
      const formatted = `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`;
      results.push({
        id: `kakao-phone-${lineIdx}-${results.length}`,
        type: "phone",
        title: sender ? `${sender} 연락처` : "연락처",
        value: formatted,
        category: "가족",
        timestamp: timeStr,
        sender,
        targetModule: "quickcopy",
        memo: `카톡 대화 중 연락처 자동 추출`,
      });
    }

    // 4. Check Spending / Money Transfer (for Finance)
    if (
      content.includes("원") &&
      (content.includes("승인") ||
        content.includes("결제") ||
        content.includes("보냈어") ||
        content.includes("이체") ||
        content.includes("입금") ||
        content.includes("출금"))
    ) {
      amountRegex.lastIndex = 0;
      const amtMatch = amountRegex.exec(content);
      if (amtMatch) {
        let rawVal = amtMatch[1].replace(/,/g, "");
        if (amtMatch[0].includes("만원")) {
          rawVal = (parseInt(rawVal, 10) * 10000).toString();
        }

        results.push({
          id: `kakao-fin-${lineIdx}-${results.length}`,
          type: "finance",
          title: content.slice(0, 30),
          value: `${parseInt(rawVal, 10).toLocaleString()}원`,
          category: "식비/일상",
          timestamp: timeStr,
          sender,
          targetModule: "finance",
          memo: content,
        });
      }
    }
  });

  // Deduplicate results by value
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.type}:${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
