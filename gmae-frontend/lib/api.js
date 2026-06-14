// gmae-frontend/lib/api.js
import axios from 'axios';

// Membuat instance axios dengan basis URL backend Anda
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Fungsi untuk mengirim data simulasi ke backend
export const sendSimulationData = async (data) => {
  try {
    const response = await api.post('/api/simulate', data);
    return response.data;
  } catch (error) {
    console.error("Gagal mengirim data simulasi:", error);
    throw error;
  }
};

// Fungsi untuk menarik history dari backend
export const getHistoryData = async () => {
  try {
    const response = await api.get('/api/history');
    return response.data;
  } catch (error) {
    console.error("Gagal menarik data history:", error);
    throw error;
  }
};