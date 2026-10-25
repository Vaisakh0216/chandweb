const Indent = require('../models/Indent');

// PO status -> Indent status
const INDENT_STATUS_FROM_PO = {
  Ordered: 'Ordered',
  Pending: 'Ordered',
  Sample: 'Ordered',
  'Partially Received': 'Partially Received',
  Received: 'Received',
  Cancelled: 'Pending',
};

const indentStatusFromPO = (po) => INDENT_STATUS_FROM_PO[po.status] || 'Ordered';

// Keep the linked indent in step with the purchase order
const syncIndentFromPO = async (po) => {
  if (!po?.indentRef) return;
  const indentId = po.indentRef._id || po.indentRef;

  // Cancelled PO: release the indent back to Pending so it can be re-ordered
  if (po.status === 'Cancelled') {
    await Indent.findOneAndUpdate(
      { _id: indentId, purchaseOrderRef: po._id },
      { $unset: { purchaseOrderRef: 1 }, status: 'Pending', receivedQuantity: 0 }
    );
    return;
  }

  // Only sync if the indent is linked to this PO (or not linked yet) —
  // a re-activated old PO must not hijack an indent that has a newer PO
  await Indent.findOneAndUpdate(
    { _id: indentId, $or: [{ purchaseOrderRef: po._id }, { purchaseOrderRef: null }] },
    {
      purchaseOrderRef: po._id,
      status: indentStatusFromPO(po),
      receivedQuantity: po.receivedQuantity || 0,
    }
  );
};

// For an indent with its purchaseOrderRef populated, take status and
// received quantity from the PO so a linked indent always matches it
const applyPOStatus = (indent) => {
  const po = indent?.purchaseOrderRef;
  if (!po || !po.status) return indent;
  const obj = indent.toObject ? indent.toObject() : indent;
  return { ...obj, status: indentStatusFromPO(po), receivedQuantity: po.receivedQuantity || 0 };
};

module.exports = { syncIndentFromPO, applyPOStatus };
