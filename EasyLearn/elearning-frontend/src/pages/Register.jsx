import React, { useState } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, Grid, 
  Alert, CircularProgress, CardActionArea
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import CreateIcon from '@mui/icons-material/Create';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' // За замовчуванням учень
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (selectedRole) => {
    setFormData({ ...formData, role: selectedRole });
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    if (/^[\x20-\x7E]*$/.test(val)) {
      setFormData({ ...formData, [e.target.name]: val });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nameRegex = /^[A-Za-zА-Яа-яІіЇїЄєҐґ\s'-]+$/;
    const cleanName = formData.full_name.trim();
    
    if (cleanName.length < 2) {
      setError('Ім\'я та прізвище мають містити щонайменше 2 символи.');
      return;
    }
    if (!nameRegex.test(cleanName)) {
      setError('Ім\'я може містити лише літери.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    const cleanEmail = formData.email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Будь ласка, введіть коректну електронну адресу.');
      return;
    }
    if (!emailRegex.test(cleanEmail)) {
      setError('Реєстрація дозволена лише для пошт @gmail.com!');
      return;
    }

    const pass = formData.password;
    if (pass.length < 8) {
      setError('Пароль має містити мінімум 8 символів!');
      return;
    }
    if (!/[A-Z]/.test(pass)) {
      setError('Пароль має містити хоча б одну велику літеру (англійську)!');
      return;
    }
    if (!/[a-z]/.test(pass)) {
      setError('Пароль має містити хоча б одну малу літеру (англійську)!');
      return;
    }
    if (!/[0-9]/.test(pass)) {
      setError('Пароль має містити хоча б одну цифру!');
      return;
    }

    if (pass !== formData.confirmPassword) {
      setError('Паролі не співпадають!');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: cleanName,
          email: cleanEmail,
          password: pass,
          role: formData.role
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'teacher') {
          navigate('/teacher');
        } else {
          navigate('/dashboard');
        }
        window.location.reload();
      } else {
        setError(data.error || 'Помилка реєстрації. Можливо, такий Email вже існує.');
      }
    } catch (err) {
      setError('Помилка з\'єднання з сервером. Перевірте підключення.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', display: 'flex', alignItems: 'center', py: { xs: 4, md: 10 } }}>
      <Container maxWidth="sm">
        <Paper elevation={12} sx={{ p: { xs: 3, md: 5 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
          
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SchoolIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>Приєднуйтесь до нас</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Оберіть свою мету та створіть акаунт
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            
            {/* ВЕЛИКИЙ ВИБІР РОЛІ */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>Ким ви хочете бути на платформі?</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={6}>
                <Paper 
                  elevation={formData.role === 'student' ? 4 : 0}
                  sx={{ 
                    border: '2px solid',
                    borderColor: formData.role === 'student' ? 'primary.main' : 'divider',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: formData.role === 'student' ? 'action.selected' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <CardActionArea onClick={() => handleRoleSelect('student')} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <AutoStoriesIcon sx={{ fontSize: 40, color: formData.role === 'student' ? 'primary.main' : 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: formData.role === 'student' ? 'primary.main' : 'text.primary' }}>Учень</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Я хочу вивчати нове</Typography>
                  </CardActionArea>
                </Paper>
              </Grid>

              <Grid item xs={6}>
                <Paper 
                  elevation={formData.role === 'teacher' ? 4 : 0}
                  sx={{ 
                    border: '2px solid',
                    borderColor: formData.role === 'teacher' ? 'warning.main' : 'divider',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    backgroundColor: formData.role === 'teacher' ? 'rgba(237, 108, 2, 0.08)' : 'transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <CardActionArea onClick={() => handleRoleSelect('teacher')} sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                    <CreateIcon sx={{ fontSize: 40, color: formData.role === 'teacher' ? 'warning.main' : 'text.secondary', mb: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, color: formData.role === 'teacher' ? 'warning.main' : 'text.primary' }}>Автор</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>Я хочу створити курс</Typography>
                  </CardActionArea>
                </Paper>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Ім'я та Прізвище" 
                  name="full_name" 
                  value={formData.full_name} 
                  onChange={handleChange} 
                  required 
                  helperText="Як до вас звертатися?"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Електронна пошта" 
                  name="email" 
                  type="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                  helperText="Тільки адреси @gmail.com"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Пароль" 
                  name="password" 
                  type="password" 
                  value={formData.password} 
                  onChange={handlePasswordChange} 
                  required 
                  helperText="Мін. 8 символів, цифра, велика і мала літера"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label="Підтвердіть пароль" 
                  name="confirmPassword" 
                  type="password" 
                  value={formData.confirmPassword} 
                  onChange={handlePasswordChange} 
                  required 
                />
              </Grid>
            </Grid>

            <Button 
              type="submit" variant="contained" size="large" fullWidth disabled={isLoading}
              sx={{ py: 1.5, mt: 4, mb: 3, fontWeight: 700, borderRadius: '8px', fontSize: '1.1rem', textTransform: 'none' }}
            >
              {isLoading ? <CircularProgress size={26} color="inherit" /> : 'Створити акаунт'}
            </Button>

            <Typography variant="body2" align="center" color="text.secondary">
              Вже маєте акаунт?{' '}
              <RouterLink to="/login" style={{ textDecoration: 'none' }}>
                <Typography component="span" variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
                  Увійти
                </Typography>
              </RouterLink>
            </Typography>
          </form>
        </Paper>
      </Container>
    </Box>
  );
}