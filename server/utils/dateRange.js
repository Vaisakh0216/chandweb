// Mongo date filter for an inclusive from/to (YYYY-MM-DD) range, or null when neither is given
const dateRange = (from, to) => {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return range;
};

module.exports = { dateRange };
