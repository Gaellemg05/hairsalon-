const BASE_URL = 'http://localhost:8000';

export const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const clean = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_URL}${clean}`;
};

const handle401 = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/#/login';
};

const buildHeaders = (options = {}, includeJson = false) => {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }
  if (includeJson && options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
};

const authFetch = async (url, options = {}) => {
  const headers = buildHeaders(options, true);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    handle401();
    throw new Error(await res.text());
  }
  return res;
};

const apiCall = async (url, options = {}) => {
  const res = await authFetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    try {
      const parsed = JSON.parse(body);
      throw new Error(parsed.error || parsed.detail || body);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(body || `Request failed (${res.status})`);
      throw error;
    }
  }
  return res.json();
};

const apiCallMultipart = async (url, formData) => {
  const headers = buildHeaders({}, false);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (res.status === 401) {
    handle401();
    throw new Error(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const apiCallMultipartPatch = async (url, formData) => {
  const headers = buildHeaders({}, false);
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: formData,
  });
  if (res.status === 401) {
    handle401();
    throw new Error(await res.text());
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

const apiCallRaw = async (url, options = {}) => {
  const res = await authFetch(url, options);
  if (!res.ok) throw new Error(await res.text());
  return true;
};

export const api = {
  // Auth APIs
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  register: async (userData) => {
    const res = await fetch(`${BASE_URL}/api/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Users APIs
  getUser: (id) => apiCall(`${BASE_URL}/api/users/${id}/`),

  getUsers: (role = '') => apiCall(`${BASE_URL}/api/users/?role=${role}`),

  getUser: (id) => apiCall(`${BASE_URL}/api/users/${id}/`),

  createUser: (userData) => apiCall(`${BASE_URL}/api/users/`, {
    method: 'POST', body: JSON.stringify(userData),
  }),

  updateUser: (id, userData) => {
    if (userData instanceof FormData) {
      return apiCallMultipartPatch(`${BASE_URL}/api/users/${id}/`, userData);
    }
    return apiCall(`${BASE_URL}/api/users/${id}/`, {
      method: 'PATCH', body: JSON.stringify(userData),
    });
  },

  // Salons APIs
  getSalons: (managerId = '') => {
    const url = managerId ? `${BASE_URL}/api/salons/?manager=${managerId}` : `${BASE_URL}/api/salons/`;
    return apiCall(url);
  },

  getSalonsByHairdresser: (hairdresserId) => apiCall(`${BASE_URL}/api/salons/?hairdresser=${hairdresserId}`),

  getSalon: (id) => apiCall(`${BASE_URL}/api/salons/${id}/`),

  createSalon: (salonData) => {
    if (salonData instanceof FormData) {
      return apiCallMultipart(`${BASE_URL}/api/salons/`, salonData);
    }
    return apiCall(`${BASE_URL}/api/salons/`, {
      method: 'POST', body: JSON.stringify(salonData),
    });
  },

  updateSalon: (id, salonData) => {
    if (salonData instanceof FormData) {
      return apiCallMultipartPatch(`${BASE_URL}/api/salons/${id}/`, salonData);
    }
    return apiCall(`${BASE_URL}/api/salons/${id}/`, {
      method: 'PATCH', body: JSON.stringify(salonData),
    });
  },

  // Services APIs
  getServices: (salonId = '') => apiCall(`${BASE_URL}/api/services/?salon=${salonId}`),

  createService: (serviceData) => apiCall(`${BASE_URL}/api/services/`, {
    method: 'POST', body: JSON.stringify(serviceData),
  }),

  updateService: (id, serviceData) => apiCall(`${BASE_URL}/api/services/${id}/`, {
    method: 'PATCH', body: JSON.stringify(serviceData),
  }),

  deleteService: (id) => apiCallRaw(`${BASE_URL}/api/services/${id}/`, {
    method: 'DELETE',
  }),

// Salon Publications
getSalonPublications: (salonId = '') => apiCall(`${BASE_URL}/api/salon-publications/${salonId ? `?salon=${salonId}` : ''}`),

getAllSalonPublications: () => apiCall(`${BASE_URL}/api/salon-publications/`),

createSalonPublication: (formData) => apiCallMultipart(`${BASE_URL}/api/salon-publications/`, formData),

updateSalonPublication: (id, formData) => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return fetch(`${BASE_URL}/api/salon-publications/${id}/`, {
    method: 'PATCH',
    headers,
    body: formData,
  }).then(res => {
    if (res.status === 401) handle401();
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  });
},

deleteSalonPublication: (id) => apiCallRaw(`${BASE_URL}/api/salon-publications/${id}/`, {
  method: 'DELETE',
}),

  // Users by role
  getUsersByRole: (role) => apiCall(`${BASE_URL}/api/users/?role=${role}`),

  // Salon management
  addHairdresser: (salonId, hairdresserId) => apiCall(`${BASE_URL}/api/salons/${salonId}/add_hairdresser/`, {
    method: 'POST', body: JSON.stringify({ hairdresser_id: hairdresserId }),
  }),

  removeHairdresser: (salonId, hairdresserId) => apiCall(`${BASE_URL}/api/salons/${salonId}/remove_hairdresser/`, {
    method: 'POST', body: JSON.stringify({ hairdresser_id: hairdresserId }),
  }),

// Hairstyle Publications
getHairstyles: (hairdresserId = '') => apiCall(`${BASE_URL}/api/hairstyle-publications/?hairdresser=${hairdresserId}`),

getAllHairstylePublications: () => apiCall(`${BASE_URL}/api/hairstyle-publications/`),

createHairstyle: (formData) => apiCallMultipart(`${BASE_URL}/api/hairstyle-publications/`, formData),

updateHairstyle: (id, formData) => {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return fetch(`${BASE_URL}/api/hairstyle-publications/${id}/`, {
    method: 'PATCH',
    headers,
    body: formData,
  }).then(res => {
    if (res.status === 401) handle401();
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  });
},

deleteHairstyle: (id) => apiCallRaw(`${BASE_URL}/api/hairstyle-publications/${id}/`, {
  method: 'DELETE',
}),

  // Reviews
  createReview: (reviewData) => apiCall(`${BASE_URL}/api/reviews/`, {
    method: 'POST', body: JSON.stringify(reviewData),
  }),

  // Availabilities (Schedule)
  getAvailabilities: (hairdresserId = '') => apiCall(`${BASE_URL}/api/availability/?hairdresser=${hairdresserId}`),

  createAvailability: (availabilityData) => apiCall(`${BASE_URL}/api/availability/`, {
    method: 'POST', body: JSON.stringify(availabilityData),
  }),

  bulkSetAvailability: (hairdresserId, slots) => apiCall(`${BASE_URL}/api/availability/bulk_set/`, {
    method: 'POST', body: JSON.stringify({ hairdresser: hairdresserId, slots }),
  }),

  getAvailableSlots: (hairdresserId, date, serviceId = '') => {
    let url = `${BASE_URL}/api/availability/available_slots/?hairdresser=${hairdresserId}&date=${date}`;
    if (serviceId) url += `&service=${serviceId}`;
    return apiCall(url);
  },

  deleteAvailability: (id) => apiCallRaw(`${BASE_URL}/api/availability/${id}/`, {
    method: 'DELETE',
  }),

  // Appointments (Bookings)
  getAppointments: () => apiCall(`${BASE_URL}/api/appointments/`),

  createAppointment: (apptData) => apiCall(`${BASE_URL}/api/appointments/`, {
    method: 'POST', body: JSON.stringify(apptData),
  }),

  updateAppointment: (id, apptData) => apiCall(`${BASE_URL}/api/appointments/${id}/`, {
    method: 'PATCH', body: JSON.stringify(apptData),
  }),

  // Subscription
  subscribeSalon: (salonId, data) => apiCall(`${BASE_URL}/api/salons/${salonId}/subscribe/`, {
    method: 'POST', body: JSON.stringify(data),
  }),

  checkSubscriptionStatus: (salonId, reference) => apiCall(`${BASE_URL}/api/salons/${salonId}/check_subscription/?reference=${encodeURIComponent(reference)}`),

  demoApproveSubscription: (salonId, reference) => apiCall(`${BASE_URL}/api/salons/${salonId}/demo_approve/`, {
    method: 'POST', body: JSON.stringify({ reference }),
  }),

  getSubscriptionTransactions: (salonId) => apiCall(`${BASE_URL}/api/salons/${salonId}/transactions/`),

  // Chats
  getChats: () => apiCall(`${BASE_URL}/api/chats/`),

  createChat: (chatData) => apiCall(`${BASE_URL}/api/chats/`, {
    method: 'POST', body: JSON.stringify(chatData),
  }),

  findOrCreateChat: (chatData) => apiCall(`${BASE_URL}/api/chats/find_or_create/`, {
    method: 'POST', body: JSON.stringify(chatData),
  }),

  getChatMessages: (chatId) => apiCall(`${BASE_URL}/api/chats/${chatId}/messages/`),

  markChatRead: (chatId) => apiCall(`${BASE_URL}/api/chats/${chatId}/mark_read/`, {
    method: 'POST',
  }),

  archiveChat: (chatId) => apiCall(`${BASE_URL}/api/chats/${chatId}/archive/`, {
    method: 'POST',
  }),

  deleteChat: (chatId) => apiCallRaw(`${BASE_URL}/api/chats/${chatId}/`, {
    method: 'DELETE',
  }),

  sendMessage: (chatId, content = '', imageFile = null) => {
    if (imageFile) {
      const formData = new FormData();
      if (content) formData.append('content', content);
      formData.append('image', imageFile);
      return apiCallMultipart(`${BASE_URL}/api/chats/${chatId}/send_message/`, formData);
    }
    return apiCall(`${BASE_URL}/api/chats/${chatId}/send_message/`, {
      method: 'POST', body: JSON.stringify({ content }),
    });
  },

  // AI Virtual Try-On APIs
  aiVirtualTryOn: async (userImage, hairImage, options = {}) => {
    return apiCall(`${BASE_URL}/api/ai/try-on/`, {
      method: 'POST',
      body: JSON.stringify({
        user_image: userImage,
        hair_image: hairImage,
        options,
      }),
    });
  },

  validateHairstyle: async (imageData, filename = '') => {
    return apiCall(`${BASE_URL}/api/ai/validate-hairstyle/`, {
      method: 'POST',
      body: JSON.stringify({
        image: imageData,
        filename,
      }),
    });
  },
};
