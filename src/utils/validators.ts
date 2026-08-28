export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
  return phoneRegex.test(phone);
};

export const isValidLatitude = (lat: number): boolean => {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
};

export const isValidLongitude = (lon: number): boolean => {
  return typeof lon === 'number' && lon >= -180 && lon <= 180;
};
