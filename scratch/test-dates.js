const selectedDateStr = "2026-06-26";
const [y, m, d] = selectedDateStr.split('-').map(Number);
const startOfDayUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - (330 * 60_000));
const endOfDayUTC = new Date(startOfDayUTC.getTime() + 86_400_000);

console.log("selectedDateStr:", selectedDateStr);
console.log("startOfDayUTC ISO:", startOfDayUTC.toISOString());
console.log("endOfDayUTC ISO:", endOfDayUTC.toISOString());
