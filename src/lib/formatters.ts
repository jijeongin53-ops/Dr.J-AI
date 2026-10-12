// [전화번호, 생년월일, 성명 검증 및 정규화 유틸리티]

/**
 * 성명 검증: 한글 2~4자 이내 (영문, 숫자, 특수문자, 공백 불가)
 */
export function validateKoreanName(name: string): { valid: boolean; message?: string } {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    return { valid: false, message: '성명을 입력해 주세요.' };
  }
  // 한글 음절 2자 이상 4자 이하 정규식
  const koreanRegex = /^[가-힣]{2,4}$/;
  if (!koreanRegex.test(trimmed)) {
    return {
      valid: false,
      message: '성명은 한글 2~4자 이내로만 입력 가능합니다. (영문, 숫자, 특수문자 불가)',
    };
  }
  return { valid: true };
}

/**
 * 전화번호 뒤 4자리 추출
 */
export function getLast4PhoneDigits(phone: string): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  return digits.slice(-4);
}

/**
 * 전화번호 정규화: 어떤 형태로 입력되든 000-0000-0000 형식으로 변환
 * (예: 1073587280 -> 010-7358-7280, 01012345678 -> 010-1234-5678)
 */
export function formatPhoneNumber(input: string | number): string {
  if (!input) return '';
  let digits = String(input).replace(/\D/g, '');

  // 82로 시작하는 국가번호 처리 (예: 821073587280 -> 01073587280)
  if (digits.startsWith('82') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  }

  // 구글 시트 또는 입력에서 맨 앞 0이 생략된 10자리 번호 (예: 1073587280 -> 01073587280)
  if (digits.startsWith('10') && digits.length === 10) {
    digits = '0' + digits;
  }

  // 11자리 휴대폰 번호 (010-XXXX-XXXX)
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  // 10자리 번호 (02-XXXX-XXXX 또는 011-XXX-XXXX)
  if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // 9자리 유선 번호 (02-XXX-XXXX)
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }

  // 12자리 이상 또는 기타 형식
  if (digits.length > 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  return digits;
}

/**
 * 생년월일 정규화: 어떤 형태로 입력되든 0000-00-00 (YYYY-MM-DD) 형식으로 변환
 * (예: 19780418 -> 1978-04-18, 790719 -> 1979-07-19, 20050412 -> 2005-04-12, ISO -> YYYY-MM-DD)
 */
export function formatBirthDate(input: any): string {
  if (!input) return '';
  const str = String(input).trim();

  // 1. 이미 YYYY-MM-DD 형식인 경우
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 2. ISO 일시 형식 (예: 1980-07-18T15:00:00.000Z)
  if (str.includes('T')) {
    try {
      const date = new Date(str);
      if (!isNaN(date.getTime())) {
        // 한국 시간(KST +9) 보정
        const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
        const y = kst.getUTCFullYear();
        const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
        const d = String(kst.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (_) {}
  }

  // 3. 숫자만 추출
  let digits = str.replace(/\D/g, '');

  // 구글 시트 숫자 서식으로 앞자리 0이 탈락한 5자리 (예: 21112 -> 021112 = 2002-11-12)
  if (digits.length === 5) {
    digits = '0' + digits;
  }

  // 8자리 이상 (예: 19780418 또는 197312122 -> 앞 8자리 사용)
  if (digits.length >= 8) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 6);
    const d = digits.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // 6자리 (YYMMDD)
  if (digits.length === 6) {
    const yy = parseInt(digits.slice(0, 2), 10);
    // 30 초과면 1900년대(1931~1999), 30 이하면 2000년대(2000~2030)
    const fullYear = yy > 30 ? `19${digits.slice(0, 2)}` : `20${digits.slice(0, 2)}`;
    const m = digits.slice(2, 4);
    const d = digits.slice(4, 6);
    return `${fullYear}-${m}-${d}`;
  }

  // 7자리 (예: 1970101)
  if (digits.length === 7 && (digits.startsWith('19') || digits.startsWith('20'))) {
    const y = digits.slice(0, 4);
    const m = digits.slice(4, 5).padStart(2, '0');
    const d = digits.slice(5, 7);
    return `${y}-${m}-${d}`;
  }

  return str;
}
