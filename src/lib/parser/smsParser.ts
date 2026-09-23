export interface ParsedTransaction {
  amount: number;
  merchant: string;
  date: string;
  time?: string;
  paymentMethod?: string;
  category: string;
  rawText: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  식비: ["식당", "밥", "찌개", "구이", "버거", "맥도날드", "버거킹", "서브웨이", "치킨", "피자", "김밥", "한식", "중식", "일식", "고기", "국밥", "배달의민족", "요기요", "쿠팡이츠"],
  카페: ["스타벅스", "투썸", "이디야", "메가커피", "컴포즈", "빽다방", "카페", "커피", "디저트", "베이커리", "파리바게뜨", "뚜레쥬르"],
  교통: ["택시", "카카오T", "티머니", "코레일", "SRT", "지하철", "버스", "주유소", "GS칼텍스", "SK에너지", "S-OIL", "하이패스"],
  쇼핑: ["쿠팡", "네이버페이", "11번가", "G마켓", "무신사", "올리브영", "다이소", "이마트", "홈플러스", "롯데마트", "GS25", "CU", "세븐일레븐"],
  정기결제: ["넷플릭스", "유튜브", "스포티파이", "애플", "구글", "통신요금", "SKT", "KT", "LGU+", "관리비", "전기세"],
  의료: ["병원", "의원", "약국", "치과", "안과", "이비인후과", "한의원"],
};

export function inferCategory(merchant: string): string {
  const normalized = merchant.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        return cat;
      }
    }
  }
  return "기타";
}

export function parseSms(text: string): ParsedTransaction | null {
  if (!text || text.trim().length === 0) return null;

  // 1. 금액 추출 (예: 12,500원, 3,000 KRW, 45000원 등)
  const amountMatch = text.match(/([\d,]+)\s*(?:원|KRW)/i);
  let amount = 0;
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  }

  // 2. 날짜/시간 추출 (예: 09/22 14:30, 2026.09.22 13:00 등)
  const dateTimeMatch = text.match(/(\d{1,2}[\/\.]\d{1,2}(?:\s+\d{1,2}:\d{2})?)/);
  const now = new Date();
  let dateStr = now.toISOString().split("T")[0];
  let timeStr = "";

  if (dateTimeMatch) {
    const rawDate = dateTimeMatch[1];
    const parts = rawDate.split(" ");
    const monthDay = parts[0].replace(/\./g, "/").split("/");
    if (monthDay.length >= 2) {
      const m = monthDay[0].padStart(2, "0");
      const d = monthDay[1].padStart(2, "0");
      dateStr = `${now.getFullYear()}-${m}-${d}`;
    }
    if (parts.length > 1) {
      timeStr = parts[1];
    }
  }

  // 3. 결제 수단 추출 (카드사/은행명)
  const paymentMethods = ["신한", "현대", "국민", "KB", "삼성", "토스", "카카오뱅크", "카카오페이", "네이버페이", "우리", "하나", "농협", "BC", "씨티"];
  let paymentMethod = "카드";
  for (const pm of paymentMethods) {
    if (text.includes(pm)) {
      paymentMethod = `${pm}카드`;
      break;
    }
  }

  // 4. 가맹점 (상호명) 추출
  // 일반적인 SMS 포맷: [Web발신] ... 15,000원 ... 스타벅스강남점 승인
  let merchant = "미확인 가맹점";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // 줄 끝에 승인, 결제 등이 붙어 있는 경우
    const endMatch = line.match(/^(.+?)\s*(?:승인|결제|완료)$/);
    if (endMatch && !endMatch[1].includes("원")) {
      merchant = endMatch[1].trim();
      break;
    }

    // 금액 다음에 나오는 패턴
    if (line.includes("원") && lines.indexOf(line) + 1 < lines.length) {
      const nextLine = lines[lines.indexOf(line) + 1];
      if (!nextLine.includes("누적") && !nextLine.includes("잔액") && !nextLine.includes("할부")) {
        merchant = nextLine.replace(/승인.*$/, "").trim();
        break;
      }
    }
  }

  // 특수 기호 제거
  merchant = merchant.replace(/^\[.*?\]\s*/, "").replace(/^.*?\d{1,2}\/\d{1,2}\s*/, "").trim();
  if (!merchant || merchant.length > 30) {
    merchant = "가맹점";
  }

  const category = inferCategory(merchant);

  return {
    amount: amount || 0,
    merchant,
    date: dateStr,
    time: timeStr || now.toTimeString().slice(0, 5),
    paymentMethod,
    category,
    rawText: text,
  };
}
