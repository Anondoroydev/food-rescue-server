import crypto from 'crypto';
import fs from 'fs';

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

/**
 * Calculate distance between two coordinates using Haversine formula (returns kilometers)
 */
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

export const parseCSV = (filePath: string): Array<Record<string, string>> => {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
};
