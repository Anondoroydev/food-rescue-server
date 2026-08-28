export const USER_ROLES = ['restaurant', 'ngo', 'admin'] as const;
export const FOOD_STATUS = ['available', 'requested', 'collected', 'expired'] as const;
export const REQUEST_STATUS = ['pending', 'approved', 'rejected', 'collected', 'delivered'] as const;
export const NOTIFICATION_TYPES = [
  'food_posted',
  'request_received',
  'request_approved',
  'request_rejected',
  'reminder',
  'alert',
  'message'
] as const;
