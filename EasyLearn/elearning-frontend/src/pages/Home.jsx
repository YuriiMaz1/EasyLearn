import React, { useState, useEffect } from 'react';
import { Container, Card, CardContent, Button, Box, Typography, Paper, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

useEffect(() => {
    fetch('http://localhost:3000/api/courses/top')
      .then(response => {
        // Якщо сервер повернув 429 або 500, перериваємо ланцюжок
        if (!response.ok) throw new Error(`Помилка сервера: ${response.status}`);
        return response.json();
      })
      .then(data => {
        // ЖОРСТКИЙ ЗАХИСТ: Перевіряємо, чи це дійсно масив
        if (Array.isArray(data)) {
          setCourses(data);
        } else if (data.courses && Array.isArray(data.courses)) {
          // На випадок, якщо бекенд загортає масив у { success: true, courses: [] }
          setCourses(data.courses);
        } else {
          setCourses([]);
        }
      })
      .catch(error => {
        console.error("Помилка завантаження курсів:", error);
        setCourses([]); 
      });
  }, []);
  return (
    // Додано overflowX: 'hidden' для глобального захисту від горизонтального скролу
    <Box sx={{ overflowX: 'hidden' }}>
      <Paper elevation={0} sx={{ 
        position: 'relative', 
        backgroundColor: 'background.default', 
        mb: { xs: 4, md: 8 }, 
        py: { xs: 6, md: 12 }, // Менші відступи на телефоні
        px: { xs: 2, md: 0 },
        borderRadius: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <Typography 
              component="h1" 
              variant="h3" 
              gutterBottom 
              sx={{ 
                fontFamily: '"Google Sans", "Roboto", sans-serif', 
                fontWeight: 800, 
                color: 'text.primary', 
                mb: 3,
                // Адаптивний розмір шрифту: на телефоні менший, на ПК більший
                fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.5rem' },
                lineHeight: 1.2,
                wordBreak: 'break-word' // Забороняє довгому слову ламати екран
              }}
            >
              Сучасна платформа для <span style={{ color: '#1976d2' }}>легкого</span> навчання
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                mb: { xs: 4, md: 5 }, 
                fontWeight: 400, 
                maxWidth: '600px',
                fontSize: { xs: '1rem', md: '1.25rem' } // Зменшуємо підзаголовок на моб.
              }}
            >
              Знайдіть найкращі курси від локальних викладачів або створіть свій власний навчальний проєкт за лічені хвилини.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="large" 
              onClick={() => navigate('/catalog')} 
              sx={{ 
                textTransform: 'none', 
                borderRadius: '8px', 
                px: 5, py: 1.5, 
                fontSize: '1.1rem', 
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' } // Кнопка на всю ширину екрана на телефоні
              }}
            >
              Перейти до каталогу
            </Button>
          </Box>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mb: 10 }}>
        {/* Адаптивний заголовок блоку: на телефоні стає в стовпчик */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          gap: { xs: 1, sm: 0 },
          mb: 4 
        }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '1.5rem', md: '1.8rem' } }}>
            Вибір студентів (Топ курси)
          </Typography>
          <Button variant="text" onClick={() => navigate('/catalog')} sx={{ fontWeight: 600, textTransform: 'none', alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            Дивитися всі
          </Button>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: 3 
        }}>
          {courses.map((course) => (
            <Card key={course.id} sx={{ 
              height: '100%', display: 'flex', flexDirection: 'column', 
              borderRadius: '12px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden', position: 'relative',
              backgroundColor: 'background.paper',
              transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' } 
            }}>
              
              <Chip icon={<WorkspacePremiumIcon fontSize="small" />} label="Топ рейтинг" color="warning" size="small" sx={{ position: 'absolute', top: 12, left: 12, fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />

              <Box sx={{ width: '100%', height: 180, flexShrink: 0, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'divider' }} />
              
              <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                  <Chip label={course.category || 'Інше'} size="small" sx={{ backgroundColor: 'action.hover', fontWeight: 600, color: 'text.secondary' }} />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ color: '#ffb400', fontSize: 18, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{Number(course.average_rating || 0).toFixed(1)}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({course.review_count || 0})</Typography>
                  </Box>
                </Box>
                
                <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1, wordWrap: 'break-word', minHeight: '2.4em', color: 'text.primary' }}>
                  {course.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mb: 2 }}>
                  {course.description}
                </Typography>
                
                <Box sx={{ flexGrow: 1 }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip icon={<AccessTimeIcon fontSize="small" />} label={course.duration} size="small" sx={{ backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 500 }} />
                  <Chip label={course.level} size="small" variant="outlined" sx={{ fontWeight: 500, color: 'text.secondary' }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalOfferIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                    {Number(course.price) === 0 ? 'Безкоштовно' : `${course.price} грн`}
                  </Typography>
                </Box>

                <Button variant="contained" fullWidth sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }} onClick={() => navigate(`/course/${course.id}`)}>
                  Переглянути курс
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>
    </Box>
  );
}