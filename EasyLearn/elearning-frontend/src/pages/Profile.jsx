import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, Avatar, 
  Grid, Divider, Alert, CircularProgress, Chip 
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [savedCard, setSavedCard] = useState('');

  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    card_number: '',
    bio: '' // ДОДАНО: Стейт для біографії
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);

    fetch('http://localhost:3000/api/users')
      .then(res => res.json())
      .then(users => {
        const currentUser = users.find(u => u.id === parsedUser.id);
        if (currentUser) {
          setFormData(prev => ({
            ...prev,
            full_name: currentUser.full_name || '',
            email: currentUser.email || '',
            card_number: currentUser.card_number || '',
            bio: currentUser.bio || '' // ДОДАНО: Завантаження біографії
          }));
          setSavedCard(currentUser.card_number || '');
        }
      })
      .catch(err => console.error("Помилка завантаження даних профілю:", err));
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    if (/^[\x20-\x7E]*$/.test(val)) {
      setFormData({ ...formData, [e.target.name]: val });
    }
  };

  const handleCardChange = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.slice(0, 16);
    const formattedCard = val.replace(/(.{4})/g, '$1 ').trim();
    setFormData({ ...formData, card_number: formattedCard });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (formData.newPassword || formData.oldPassword || formData.confirmPassword) {
      if (!formData.oldPassword) {
        setMessage({ type: 'error', text: 'Для зміни пароля необхідно ввести поточний пароль!' });
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: 'error', text: 'Нові паролі не співпадають!' });
        return;
      }
      if (formData.newPassword.length < 6) {
        setMessage({ type: 'error', text: 'Новий пароль має містити мінімум 6 символів!' });
        return;
      }
    }

    if (user.role === 'teacher' && formData.card_number) {
      const cleanCard = formData.card_number.replace(/\s/g, '');
      if (cleanCard.length !== 16) {
        setMessage({ type: 'error', text: 'Номер картки повинен містити рівно 16 цифр!' });
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword,
          card_number: formData.card_number,
          bio: formData.bio // ДОДАНО: Відправка біографії на бекенд
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedUser = { ...user, full_name: formData.full_name, email: formData.email };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        
        setSavedCard(formData.card_number);
        setMessage({ type: 'success', text: data.message || 'Дані успішно оновлено!' });
        setFormData(prev => ({ ...prev, oldPassword: '', newPassword: '', confirmPassword: '' }));
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage({ type: 'error', text: data.error || 'Помилка оновлення даних.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Помилка з\'єднання з сервером.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', pt: 5, pb: 10 }}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, display: 'flex', alignItems: 'center', gap: 2, color: 'text.primary' }}>
          <AccountCircleIcon fontSize="large" color="primary" />
          Особистий кабінет
        </Typography>

        <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', backgroundColor: 'background.paper' }}>
          <Box sx={{ height: '120px', backgroundColor: 'primary.main', position: 'relative' }}>
            <Avatar 
              sx={{ 
                width: 100, height: 100, fontSize: '3rem', fontWeight: 700,
                position: 'absolute', bottom: '-50px', left: '40px',
                border: '4px solid', borderColor: 'background.paper', bgcolor: 'secondary.main', color: '#fff'
              }}
            >
              {user.full_name.charAt(0)}
            </Avatar>
          </Box>

          <Box sx={{ pt: 8, px: { xs: 3, md: 5 }, pb: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', mb: 4 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>{user.full_name}</Typography>
                <Typography variant="body1" color="text.secondary">{user.email}</Typography>
              </Box>
              <Chip 
                label={user.role === 'teacher' ? 'Викладач' : user.role === 'admin' ? 'Адміністратор' : 'Студент'} 
                color={user.role === 'teacher' ? 'warning' : 'primary'} 
                sx={{ fontWeight: 700, mt: { xs: 2, sm: 0 } }} 
              />
            </Box>

            <Divider sx={{ mb: 4 }} />

            {message.text && <Alert severity={message.type} sx={{ mb: 4 }}>{message.text}</Alert>}

            <form onSubmit={handleSubmit} noValidate>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>Основні дані</Typography>
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Ім'я та Прізвище" name="full_name" value={formData.full_name} onChange={handleChange} required />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField fullWidth label="Електронна пошта" name="email" type="email" value={formData.email} onChange={handleChange} required />
                </Grid>

                {/* ДОДАНО: Поле для біографії (Тільки для викладачів) */}
                {user.role === 'teacher' && (
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      multiline 
                      rows={4} 
                      label="Про себе (Біографія)" 
                      name="bio" 
                      value={formData.bio} 
                      onChange={handleChange} 
                      placeholder="Розкажіть студентам про свій досвід, навички та що ви викладаєте..."
                      helperText="Ця інформація буде відображатися на вашій публічній сторінці викладача."
                    />
                  </Grid>
                )}
              </Grid>

              {user.role === 'teacher' && (
                <>
                  <Divider sx={{ mb: 4 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CreditCardIcon /> Фінансові реквізити
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Ця картка використовується платформою для зарахування гонорарів від продажу курсів.
                  </Typography>

                  {savedCard ? (
                    <Alert 
                      icon={<CheckCircleIcon fontSize="inherit" />}
                      severity="success" 
                      sx={{ mb: 3, borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                    >
                      Актуальна картка для виплат: <strong>{savedCard}</strong>
                    </Alert>
                  ) : (
                    <Alert severity="warning" icon={<InfoOutlinedIcon />} sx={{ mb: 3, borderRadius: '8px' }}>
                      Ви ще не додали картку для виплат. Зробіть це нижче, щоб мати змогу отримувати кошти.
                    </Alert>
                  )}

                  <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={6}>
                      <TextField 
                        fullWidth 
                        label={savedCard ? "Змінити номер банківської картки" : "Номер банківської картки"}
                        name="card_number" 
                        value={formData.card_number} 
                        onChange={handleCardChange} 
                        inputProps={{ maxLength: 19 }}
                        placeholder="0000 0000 0000 0000"
                      />
                    </Grid>
                  </Grid>
                </>
              )}

              <Divider sx={{ mb: 4 }} />

              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Безпека (Зміна пароля)</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Залиште ці поля порожніми, якщо не бажаєте змінювати пароль.
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth label="Поточний пароль" name="oldPassword" type="password" 
                    value={formData.oldPassword} onChange={handlePasswordChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField 
                    fullWidth label="Новий пароль" name="newPassword" type="password" 
                    value={formData.newPassword} onChange={handlePasswordChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField 
                    fullWidth label="Підтвердіть новий пароль" name="confirmPassword" type="password" 
                    value={formData.confirmPassword} onChange={handlePasswordChange}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  type="submit" variant="contained" size="large" disabled={isSaving}
                  startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px', px: 4 }}
                >
                  {isSaving ? 'Збереження...' : 'Зберегти зміни'}
                </Button>
              </Box>
            </form>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}