import React, { useState, useEffect } from 'react';
import { Container, Typography, Card, CardContent, Box, LinearProgress, Paper, Avatar, Button, Chip, Divider, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]); 
  const [wishlistCourses, setWishlistCourses] = useState([]);
  
  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  const userId = user ? user.id : null;

  const fetchDashboardData = () => {
    if (!userId) return;

    const safeUserId = parseInt(userId, 10);
    if (isNaN(safeUserId)) return;

    fetch(`http://localhost:3000/api/dashboard/${safeUserId}`)
      .then(res => res.json())
      .then(data => setEnrolledCourses(Array.isArray(data) ? data : []))
      .catch(error => console.error("Помилка:", error));

    fetch(`http://localhost:3000/api/recommendations/${safeUserId}`)
      .then(res => res.json())
      .then(data => setRecommendedCourses(Array.isArray(data) ? data : []))
      .catch(error => console.error("Помилка рекомендацій:", error));

    fetch(`http://localhost:3000/api/wishlist/${safeUserId}`)
      .then(res => res.json())
      .then(data => setWishlistCourses(Array.isArray(data) ? data : []))
      .catch(error => console.error("Помилка wishlist:", error));
  };

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [userId, navigate]); 

  const handleRemoveFromWishlist = async (courseId) => {
    try {
      const res = await fetch('http://localhost:3000/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, course_id: courseId })
      });
      if (res.ok) {
        setWishlistCourses(prev => prev.filter(c => c.id !== courseId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  const initial = user.full_name.charAt(0).toUpperCase();
  const activeCourses = enrolledCourses.filter(c => c.progress_percent < 100);
  const completedCourses = enrolledCourses.filter(c => c.progress_percent === 100);

  const renderCourseCard = (course, isCompleted) => (
    <Card key={course.id} sx={{ display: 'flex', flexDirection: 'row', borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', boxShadow: 'none', height: '100%', overflow: 'hidden' }}>
      <Box sx={{ width: 140, flexShrink: 0, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'divider' }} />
      <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em', color: 'text.primary' }}>
          {course.title}
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color={isCompleted ? "success.main" : "text.secondary"} sx={{ fontWeight: 600 }}>
              {isCompleted ? "Курс пройдено" : `Прогрес: ${course.progress_percent}%`}
            </Typography>
            {isCompleted && <CheckCircleIcon color="success" fontSize="small" />}
          </Box>
          <LinearProgress variant="determinate" value={course.progress_percent} color={isCompleted ? "success" : "primary"} sx={{ height: 8, borderRadius: 5, mb: 2 }} />
          <Typography variant="body2" color={isCompleted ? "text.secondary" : "primary.main"} onClick={() => navigate(`/lesson/${course.id}`)} sx={{ display: 'flex', alignItems: 'center', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} >
            {isCompleted ? "Повторити матеріал" : <><PlayArrowIcon sx={{ mr: 0.5 }} fontSize="small" /> Продовжити навчання</>}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 10 }}>
      <Paper elevation={0} sx={{ p: 4, mb: 5, backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 3 }}>
        <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2.5rem' }}>{initial}</Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>Вітаємо, {user.full_name.split(' ')[0]}!</Typography>
          <Typography variant="body1" color="text.secondary">Твій прогрес за цей тиждень просто чудовий. Продовжуй в тому ж дусі!</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', px: 3, borderLeft: '2px solid', borderColor: 'divider' }}>
          <EmojiEventsIcon sx={{ color: 'warning.main', fontSize: 40 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>{completedCourses.length}</Typography>
          <Typography variant="body2" color="text.secondary">Завершених курсів</Typography>
        </Box>
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: 'text.primary' }}>Моє навчання</Typography>
      {activeCourses.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 6 }}>
          {activeCourses.map((course) => renderCourseCard(course, false))}
        </Box>
      ) : (
        <Paper elevation={0} sx={{ p: 4, mb: 6, textAlign: 'center', borderRadius: '12px', border: '1px dashed', borderColor: 'divider', backgroundColor: 'background.paper' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>У вас немає активних курсів</Typography>
          <Button variant="outlined" color="primary" onClick={() => navigate('/catalog')} sx={{ mt: 1 }}>Перейти до каталогу</Button>
        </Paper>
      )}

      {completedCourses.length > 0 && (
        <>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: 'success.main' }}>Завершені курси</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3, mb: 8 }}>
            {completedCourses.map(course => renderCourseCard(course, true))}
          </Box>
        </>
      )}

      {wishlistCourses.length > 0 && (
        <Box sx={{ mb: 8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FavoriteIcon sx={{ color: '#e91e63', mr: 1.5, fontSize: 30 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Збережені курси</Typography>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {wishlistCourses.map((course) => (
              <Card key={course.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', boxShadow: 'none', position: 'relative' }}>
                <Box sx={{ width: '100%', height: 160, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                
                <IconButton 
                  onClick={() => handleRemoveFromWishlist(course.id)} 
                  sx={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.8)', '&:hover': { backgroundColor: '#ffebee' } }}
                  size="small"
                >
                  <DeleteIcon color="error" />
                </IconButton>

                <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                  <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em', color: 'text.primary' }}>
                    {course.title}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <LocalOfferIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main' }}>
                      {Number(course.price) === 0 ? 'Безкоштовно' : `${course.price} грн`}
                    </Typography>
                  </Box>
                  <Button variant="outlined" color="primary" fullWidth sx={{ mt: 2, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }} onClick={() => navigate(`/course/${course.id}`)}>
                    Перейти до курсу
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {recommendedCourses.length > 0 && (
        <Box sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AutoAwesomeIcon sx={{ color: 'secondary.main', mr: 1.5, fontSize: 30 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Smart Рекомендації</Typography>
          </Box>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
           
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
            {recommendedCourses.map((course) => (
              <Card key={course.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', boxShadow: 'none', overflow: 'hidden' }}>
                <Box sx={{ width: '100%', height: 160, flexShrink: 0, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                
                <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip label={course.category} size="small" color="secondary" variant="outlined" sx={{ fontWeight: 600 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon sx={{ color: 'warning.main', fontSize: 18, mr: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {Number(course.average_rating || 0).toFixed(1)}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.4em', color: 'text.primary' }}>
                    {course.title}
                  </Typography>
                  <Box sx={{ flexGrow: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                    <LocalOfferIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'success.main' }}>
                      {Number(course.price) === 0 ? 'Безкоштовно' : `${course.price} грн`}
                    </Typography>
                  </Box>
                  <Button variant="outlined" color="secondary" fullWidth sx={{ mt: 2, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }} onClick={() => navigate(`/course/${course.id}`)}>
                    Детальніше
                  </Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}