export function isValidEmail(email) {
  // RFC 5322 simplified: local@domain.tld, with TLD at least 2 chars
  const re = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim());
}