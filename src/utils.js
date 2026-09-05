export function currency(n) {
  return '₹ ' + Number(n || 0).toFixed(2);
}

// ── Number to words (Indian numbering system) ─────────────────────────────────
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
}

function threeDigits(n) {
  if (n >= 100) {
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + twoDigits(n % 100) : '');
  }
  return twoDigits(n);
}

export function numberToWords(amount) {
  const num = Math.round(Number(amount || 0) * 100) / 100;
  if (num === 0) return 'Zero';

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = '';

  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const rem = rupees % 1000;

    if (crore > 0) result += threeDigits(crore) + ' Crore ';
    if (lakh > 0) result += threeDigits(lakh) + ' Lakh ';
    if (thousand > 0) result += threeDigits(thousand) + ' Thousand ';
    if (rem > 0) result += threeDigits(rem);

    result = result.trim();
  }

  if (paise > 0) {
    result += (result ? ' and ' : '') + twoDigits(paise) + ' Paise';
  }

  return result + ' Only';
}
