import React, { useState } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, Grid, 
  Alert, CircularProgress, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel 
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    if (!/(?=.*[A-Z])/.test(pass)) {
      setError('Пароль має містити хоча б одну велику літеру (англійську)!');
      return;
    }
    if (!/(?=.*[a-z])/.test(pass)) {
      setError('Пароль має містити хоча б одну малу літеру (англійську)!');
      return;
    }
    if (!/(?=.*[0-9])/.test(pass)) {
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
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', display: 'flex', alignItems: 'center', py: 10 }}>
      <Container maxWidth="sm">
        <Paper elevation={12} sx={{ p: { xs: 3, md: 5 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
          
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SchoolIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>Створити акаунт</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
              Приєднуйся до платформи EasyLearn
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label="Ім'я та Прізвище" 
                  name="full_name" 
                  value={formData.full_name} 
                  onChange={handleChange} 
                  required 
                  autoFocus 
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

            <FormControl component="fieldset" sx={{ mt: 3, mb: 2, width: '100%' }}>
              <FormLabel component="legend" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>Яка ваша мета?</FormLabel>
              <RadioGroup row name="role" value={formData.role} onChange={handleChange} sx={{ display: 'flex', gap: 2 }}>
                <FormControlLabel 
                  value="student" 
                  control={<Radio color="primary" />} 
                  label={<Typography color="text.primary">Я хочу вчитися</Typography>} 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: formData.role === 'student' ? 'primary.main' : 'divider', 
                    borderRadius: '8px', 
                    pr: 2, 
                    m: 0, 
                    flexGrow: 1, 
                    backgroundColor: formData.role === 'student' ? 'action.selected' : 'transparent' 
                  }}
                />
                <FormControlLabel 
                  value="teacher" 
                  control={<Radio color="warning" />} 
                  label={<Typography color="text.primary">Я хочу викладати</Typography>} 
                  sx={{ 
                    border: '1px solid', 
                    borderColor: formData.role === 'teacher' ? 'warning.main' : 'divider', 
                    borderRadius: '8px', 
                    pr: 2, 
                    m: 0, 
                    flexGrow: 1, 
                    backgroundColor: formData.role === 'teacher' ? 'action.selected' : 'transparent' 
                  }}
                />
              </RadioGroup>
            </FormControl>

            <Button 
              type="submit" variant="contained" size="large" fullWidth disabled={isLoading}
              sx={{ py: 1.5, mt: 2, mb: 3, fontWeight: 700, borderRadius: '8px', fontSize: '1.1rem', textTransform: 'none' }}
            >
              {isLoading ? <CircularProgress size={26} color="inherit" /> : 'Зареєструватися'}
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