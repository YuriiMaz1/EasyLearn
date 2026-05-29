import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Box, Paper, Button, Grid, Avatar, 
  List, ListItem, ListItemIcon, ListItemText, Divider, 
  Dialog, DialogTitle, DialogContent, CircularProgress, Chip, Alert, IconButton, Tooltip, useTheme
} from '@mui/material';
import PlayCircleFilledIcon from '@mui/icons-material/PlayCircleFilled';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SecurityIcon from '@mui/icons-material/Security';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useParams, useNavigate } from 'react-router-dom';
import ReviewsSection from '../components/ReviewsSection';

export default function CourseInfo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const theme = useTheme(); 
  
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false); 
  const [completedLessonIds, setCompletedLessonIds] = useState([]);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [error, setError] = useState(null);

  const user = useMemo(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  }, []);

  const userId = user ? user.id : null;

  useEffect(() => {
    // ПОВЕРНУЛИ НА localhost
    fetch(`http://localhost:3000/api/courses/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Курс не знайдено');
        return res.json();
      })
      .then(data => setCourse(data))
      .catch(err => {
        console.error(err);
        setError('Помилка завантаження курсу');
      });

    fetch(`http://localhost:3000/api/courses/${id}/lessons`)
      .then(res => res.json())
      .then(data => setLessons(data))
      .catch(err => console.error(err));

    if (userId) {
      fetch(`http://localhost:3000/api/dashboard/${userId}`)
        .then(res => res.json())
        .then(enrolledCourses => {
          const alreadyIn = enrolledCourses.some(c => c.id === parseInt(id));
          setIsEnrolled(alreadyIn);
        })
        .catch(err => console.error(err));

      fetch(`http://localhost:3000/api/progress/${id}/${userId}`)
        .then(res => res.json())
        .then(data => setCompletedLessonIds(data))
        .catch(err => console.error(err));

      fetch(`http://localhost:3000/api/wishlist/${userId}`)
        .then(res => res.json())
        .then(data => setIsFavorite(data.some(c => c.id === parseInt(id))))
        .catch(err => console.error(err));
    }
  }, [id, userId]);

  const handleToggleWishlist = async () => {
    if (!userId) { navigate('/login'); return; }
    try {
      const res = await fetch('http://localhost:3000/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: id })
      });
      const data = await res.json();
      if (data.success) setIsFavorite(data.isFavorite);
    } catch (err) { console.error(err); }
  };

  const enrollStudent = async () => {
    if (!userId) { navigate('/login'); return; }
    try {
      const response = await fetch('http://localhost:3000/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: userId, course_id: course.id })
      });
      const data = await response.json();
      if (data.success) {
        setIsEnrolled(true); 
        navigate(`/lesson/${course.id}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleEnrollClick = () => {
    if (!userId) { navigate('/login'); return; }
    if (course.price > 0) {
      setPaymentOpen(true);
    } else {
      enrollStudent();
    }
  };

  const processRefund = async () => {
    setIsRefunding(true);
    try {
      const response = await fetch('http://localhost:3000/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: userId, course_id: course.id })
      });
      const data = await response.json();
      if (data.success) {
        setTimeout(() => {
          setIsRefunding(false);
          setRefundSuccess(true);
          setTimeout(() => {
            setRefundOpen(false);
            setRefundSuccess(false);
            setIsEnrolled(false);
            setCompletedLessonIds([]);
          }, 2000);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setIsRefunding(false);
    }
  };

  // =========================================================
  // БЕЗПЕЧНА ОПЛАТА: Отримуємо підпис з бекенду і переходимо
  // =========================================================
  const handlePaymentSubmit = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('http://localhost:3000/api/payment/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: userId,
          course_id: course.id,
          amount: course.price
        })
      });

      const { success, data, signature } = await response.json();

      if (success) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.liqpay.ua/api/3/checkout';
        form.acceptCharset = 'utf-8';
        form.target = '_self'; 

        const dataInput = document.createElement('input');
        dataInput.type = 'hidden';
        dataInput.name = 'data';
        dataInput.value = data;

        const signatureInput = document.createElement('input');
        signatureInput.type = 'hidden';
        signatureInput.name = 'signature';
        signatureInput.value = signature;

        form.appendChild(dataInput);
        form.appendChild(signatureInput);
        document.body.appendChild(form);
        
        form.submit();
      } else {
        alert('Помилка ініціалізації платежу');
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      alert("Помилка зв'язку з сервером");
      setIsProcessing(false);
    }
  };

  if (error) return <Typography sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>{error}</Typography>;
  if (!course) return <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>Завантаження...</Typography>;

  const isFree = !course.price || course.price === 0;
  const progressPercent = lessons.length > 0 ? Math.round((completedLessonIds.length / lessons.length) * 100) : 0;
  const canRefund = progressPercent <= 20;

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', pb: 10 }}>
      {/* HEADER КУРСУ */}
      <Box sx={{ backgroundColor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', pt: 8, pb: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={7}>
              <Chip label={course.category} color="primary" sx={{ mb: 2, fontWeight: 600 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{course.title}</Typography>
                <Tooltip title={isFavorite ? "Видалити зі збереженого" : "Зберегти на потім"}>
                  <IconButton onClick={handleToggleWishlist} sx={{ backgroundColor: 'action.hover' }}>
                    {isFavorite ? <FavoriteIcon color="error" fontSize="large" /> : <FavoriteBorderIcon color="action" fontSize="large" />}
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>{course.description}</Typography>
              <Box 
                sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4, cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.8 } }}
                onClick={() => navigate(`/instructor/${course.teacher_id}`)}
              >
                <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>{course.teacher_name?.charAt(0)}</Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">Автор курсу</Typography>
                  <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700, textDecoration: 'underline' }}>
                    {course.teacher_name}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper elevation={4} sx={{ p: 4, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ width: '100%', height: '200px', backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px', mb: 3 }} />
                <Typography variant="h3" sx={{ fontWeight: 800, mb: 3, color: 'text.primary' }}>
                  {isFree ? 'Безкоштовно' : `${course.price} грн`}
                </Typography>
                <Button 
                  variant="contained" color={isEnrolled ? "success" : "primary"} size="large" fullWidth 
                  onClick={isEnrolled ? () => navigate(`/lesson/${course.id}`) : handleEnrollClick}
                  sx={{ py: 2, fontSize: '1.1rem', fontWeight: 700, borderRadius: '8px', textTransform: 'none', mb: isEnrolled && !isFree ? 2 : 4 }}
                >
                  {isEnrolled ? "Продовжити навчання" : (isFree ? "Почати вчитися зараз" : "Купити курс")}
                </Button>
                {isEnrolled && !isFree && (
                  canRefund ? (
                    <Button variant="text" color="inherit" fullWidth startIcon={<UndoIcon />} onClick={() => setRefundOpen(true)} sx={{ mb: 2, color: 'text.secondary', textTransform: 'none' }}>Повернути кошти (14 днів)</Button>
                  ) : (
                    <Alert severity="warning" icon={<InfoOutlinedIcon />} sx={{ mb: 2, borderRadius: '8px' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>Повернення коштів недоступне.</Typography>
                    </Alert>
                  )
                )}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                  <LockOutlinedIcon fontSize="small" /> Безпечна оплата. Гарантія повернення.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Grid container spacing={6}>
          <Grid item xs={12} md={8}>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: 'text.primary' }}>Програма курсу</Typography>
            <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', backgroundColor: 'background.paper' }}>
              <List disablePadding>
                {lessons.length > 0 ? lessons.map((lesson, index) => (
                  <React.Fragment key={lesson.id}>
                    <ListItem sx={{ py: 2, px: 3 }}>
                      <ListItemIcon><PlayCircleFilledIcon color="primary" /></ListItemIcon>
                      <ListItemText primary={lesson.title} secondary={`Урок ${index + 1}`} primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }} />
                    </ListItem>
                    {index !== lessons.length - 1 && <Divider />}
                  </React.Fragment>
                )) : <Typography sx={{ p: 3, color: 'text.secondary' }}>Уроки ще не додані</Typography>}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>Цей курс включає:</Typography>
              <List disablePadding>
                <ListItem disableGutters><ListItemIcon><AccessTimeIcon color="action" /></ListItemIcon><ListItemText primary={`${course.duration} відеоматеріалів`} /></ListItem>
                <ListItem disableGutters><ListItemIcon><BarChartIcon color="action" /></ListItemIcon><ListItemText primary={`Рівень: ${course.level}`} /></ListItem>
                <ListItem disableGutters><ListItemIcon><WorkspacePremiumIcon color="action" /></ListItemIcon><ListItemText primary="Сертифікат про закінчення" /></ListItem>
              </List>
            </Paper>
          </Grid>
        </Grid>
        <Divider sx={{ my: 8 }} />
        <ReviewsSection courseId={id} userId={userId} />
      </Container>

      {/* ========================================== */}
      {/* ІНФОРМАЦІЙНЕ ВІКНО ПЕРЕД ПЕРЕХОДОМ */}
      {/* ========================================== */}
      <Dialog 
        open={paymentOpen} 
        onClose={() => !isProcessing && setPaymentOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: '16px', backgroundColor: 'background.paper', overflow: 'hidden' } }}
      >
        <Box sx={{ backgroundColor: '#7ab72b', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 1 }}>LiqPay Checkout</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SecurityIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Захищено PCI-DSS</Typography>
          </Box>
        </Box>

        <Alert severity="info" sx={{ borderRadius: 0, '& .MuiAlert-message': { width: '100%' } }}>
          Натиснувши кнопку нижче, вас буде перенаправлено на <strong>офіційну захищену сторінку LiqPay</strong>. Ми не зберігаємо дані вашої картки.
        </Alert>

        <DialogContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>Сума до оплати:</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 4 }}>
            {course.price} <Typography component="span" variant="h5">UAH</Typography>
          </Typography>

          <Button 
            variant="contained" 
            fullWidth 
            onClick={handlePaymentSubmit}
            disabled={isProcessing}
            startIcon={isProcessing ? <CircularProgress size={20} color="inherit" /> : <CreditCardIcon />}
            sx={{ backgroundColor: '#7ab72b', color: '#fff', '&:hover': { backgroundColor: '#629620' }, py: 1.5, fontWeight: 700, borderRadius: '8px', fontSize: '1.1rem', textTransform: 'none' }}
          >
            {isProcessing ? "Генеруємо безпечний шлюз..." : "Перейти до оплати"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* ПОВЕРНЕННЯ КОШТІВ */}
      <Dialog open={refundOpen} onClose={() => !isRefunding && setRefundOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '16px', backgroundColor: 'background.paper' } }}>
        <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
          <UndoIcon color="error" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Повернення коштів</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 4, pt: 0, textAlign: 'center' }}>
          {refundSuccess ? (
            <Box sx={{ py: 2 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Кошти повернено!</Typography>
              <Typography variant="body2" color="text.secondary">Гроші зарахуються на вашу картку протягом 3-х робочих днів. Доступ до курсу закрито.</Typography>
            </Box>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 3, color: 'text.primary' }}>
                Ви впевнені, що хочете скасувати покупку? Ви втратите доступ до матеріалів курсу, а ваш прогрес навчання буде анульовано.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button variant="contained" color="error" size="large" onClick={processRefund} disabled={isRefunding} sx={{ py: 1.5, fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}>
                  {isRefunding ? <CircularProgress size={26} color="inherit" /> : "Так, повернути кошти"}
                </Button>
                <Button variant="outlined" color="inherit" onClick={() => setRefundOpen(false)} disabled={isRefunding} sx={{ py: 1.5, fontWeight: 600, borderRadius: '8px', textTransform: 'none', color: 'text.primary', borderColor: 'divider' }}>
                  Скасувати
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}