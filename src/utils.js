export function currency(n) {
  return '₹ ' + Number(n || 0).toFixed(2);
}
