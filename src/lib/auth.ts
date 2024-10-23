interface Admin {
  id: string;
  password: string;
}

const ADMIN_CREDENTIALS: Admin = {
  id: "bcs-prangon",
  password: "75OcPAZj12vhm5o"
};

export const validateAdmin = (id: string, password: string): boolean => {
  return id === ADMIN_CREDENTIALS.id && password === ADMIN_CREDENTIALS.password;
};