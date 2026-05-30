import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); 
    setError('');

    if (!email || !email.includes('@')) {
      setError('Будь ласка, введіть коректну електронну адресу.');
      return;
    }
    if (!password) {
      setError('Будь ласка, введіть пароль.');
      return;
    }

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (data.success && data.user) {
        const safeUser = {
          id: Number.parseInt(data.user.id, 10),
          full_name: encodeURIComponent(data.user.full_name), 
          email: encodeURIComponent(data.user.email),
          role: encodeURIComponent(data.user.role)
        };
        
        localStorage.setItem('user', JSON.stringify(safeUser));
        
        if (data.user.role === 'admin') {
          navigate('/admin');
        } else if (data.user.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/dashboard');
        }
        
        window.location.reload(); 
      } else {
        setError(data.message || 'Невірний email або пароль');
      }
    } catch (err) {
      setError("Помилка з'єднання з сервером. Перевірте підключення.");
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 10, mb: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: '12px', backgroundColor: 'background.paper' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
            Вхід до системи
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleLogin} noValidate>
            <TextField 
              fullWidth label="Електронна пошта" margin="normal" variant="outlined" required
              type="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <TextField 
              fullWidth label="Пароль" type="password" margin="normal" variant="outlined" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <Button 
              type="submit" fullWidth variant="contained" color="primary" size="large" 
              sx={{ mt: 3, mb: 2, py: 1.5, fontWeight: 600, borderRadius: '8px', textTransform: 'none', fontSize: '1.1rem' }}
            >
              Увійти
            </Button>
          </form>

          <Typography variant="body2" align="center" color="text.secondary">
            Ще не зареєстровані?{' '}
            <RouterLink to="/register" style={{ textDecoration: 'none' }}>
              <Typography component="span" variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                Створити акаунт
              </Typography>
            </RouterLink>
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}