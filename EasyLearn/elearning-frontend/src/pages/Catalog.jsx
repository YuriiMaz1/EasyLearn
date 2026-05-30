import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Card, CardContent, Box, Chip, Button, 
  Drawer, IconButton, Divider, FormGroup, FormControlLabel, Checkbox, Radio, RadioGroup, CircularProgress
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';

const categoriesList = ['Програмування', 'Дизайн', 'Менеджмент', 'Маркетинг', 'Інше'];
const levelsList = ['Для початківців', 'Середній рівень', 'Просунутий'];

export default function Catalog() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [wishlist, setWishlist] = useState([]); 
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true); 
  
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState('Всі');
  const [selectedPrice, setSelectedPrice] = useState('Всі'); 

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;

useEffect(() => {
    setIsLoading(true); 
    fetch('http://localhost:3000/api/courses')
      .then(res => {
        if (!res.ok) throw new Error('Помилка сервера');
        return res.json();
      })
      .then(data => {
        setCourses(Array.isArray(data) ? data : []);
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("Помилка завантаження каталогу:", err);
        setIsLoading(false);
      });

    if (user && user.id) {
      const safeUserId = parseInt(user.id, 10);
      if (!isNaN(safeUserId)) {
        fetch(`http://localhost:3000/api/wishlist/${safeUserId}`)
          .then(res => res.json())
          .then(data => setWishlist(data.map(c => c.id)))
          .catch(err => console.error(err));
      }
    }
  }, [user?.id]);
  const handleCategoryChange = (category) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleToggleWishlist = async (e, courseId) => {
    e.stopPropagation(); 
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:3000/api/wishlist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, course_id: courseId })
      });
      const data = await res.json();
      if (data.success) {
        setWishlist(prev => 
          data.isFavorite ? [...prev, courseId] : prev.filter(id => id !== courseId)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchCategory = selectedCategories.length === 0 || selectedCategories.includes(course.category);
    const matchLevel = selectedLevel === 'Всі' || course.level === selectedLevel;
    
    let matchPrice = true;
    if (selectedPrice === 'Безкоштовні') matchPrice = Number(course.price) === 0;
    if (selectedPrice === 'Платні') matchPrice = Number(course.price) > 0;

    return matchCategory && matchLevel && matchPrice;
  });

  return (
    // overflowX: 'hidden' захищає весь компонент від повзунків
    <Container maxWidth="lg" sx={{ mt: { xs: 3, md: 5 }, mb: 10, minHeight: '70vh', overflowX: 'hidden' }}>
      
      {/* Шапка з адаптивним флексом: на телефоні стовпчик, на ПК - рядок */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        gap: 2,
        mb: 4 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontSize: { xs: '2rem', md: '2.125rem' } }}>
          Каталог курсів
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<FilterListIcon />} 
          onClick={() => setIsDrawerOpen(true)}
          sx={{ borderRadius: '20px', textTransform: 'none', fontWeight: 600, px: 3 }}
        >
          Фільтри {(selectedCategories.length > 0 || selectedLevel !== 'Всі' || selectedPrice !== 'Всі') && ' (Активні)'}
        </Button>
      </Box>

      {/* Бокове меню фільтрів */}
      <Drawer anchor="right" open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        {/* Ширина 280px для телефонів, щоб не вилазило за межі екрана 320px */}
        <Box sx={{ width: { xs: 280, sm: 350 }, p: 3, backgroundColor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Налаштування пошуку</Typography>
            <IconButton onClick={() => setIsDrawerOpen(false)}><CloseIcon /></IconButton>
          </Box>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Вартість</Typography>
          <RadioGroup value={selectedPrice} onChange={(e) => setSelectedPrice(e.target.value)} sx={{ mb: 3 }}>
            <FormControlLabel value="Всі" control={<Radio />} label={<Typography color="text.primary">Будь-яка</Typography>} />
            <FormControlLabel value="Безкоштовні" control={<Radio />} label={<Typography color="text.primary">Безкоштовні</Typography>} />
            <FormControlLabel value="Платні" control={<Radio />} label={<Typography color="text.primary">Платні</Typography>} />
          </RadioGroup>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Напрямок</Typography>
          <FormGroup sx={{ mb: 3 }}>
            {categoriesList.map(cat => (
              <FormControlLabel key={cat} control={<Checkbox checked={selectedCategories.includes(cat)} onChange={() => handleCategoryChange(cat)} />} label={<Typography color="text.primary">{cat}</Typography>} />
            ))}
          </FormGroup>
          <Divider sx={{ mb: 3 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Рівень підготовки</Typography>
          <RadioGroup value={selectedLevel} onChange={(e) => setSelectedLevel(e.target.value)} sx={{ mb: 3 }}>
            <FormControlLabel value="Всі" control={<Radio />} label={<Typography color="text.primary">Будь-який</Typography>} />
            {levelsList.map(level => (
              <FormControlLabel key={level} value={level} control={<Radio />} label={<Typography color="text.primary">{level}</Typography>} />
            ))}
          </RadioGroup>

          {/* Кнопки фільтра: на дуже вузьких екранах в стовпчик */}
          <Box sx={{ mt: 'auto', pt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Button variant="outlined" fullWidth onClick={() => { setSelectedCategories([]); setSelectedLevel('Всі'); setSelectedPrice('Всі'); }}>
              Скинути
            </Button>
            <Button variant="contained" fullWidth onClick={() => setIsDrawerOpen(false)}>
              Застосувати
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Відображення списку курсів */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '40vh' }}>
          <CircularProgress size={60} thickness={4} color="primary" />
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, 
          gap: 3 
        }}>
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => {
              const isCourseFavorite = wishlist.includes(course.id);
              
              return (
                <Card key={course.id} sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: '12px', 
                  border: '1px solid',
                  borderColor: 'divider', 
                  boxShadow: 'none',
                  overflow: 'hidden',
                  backgroundColor: 'background.paper',
                  position: 'relative',
                  transition: 'transform 0.2s', 
                  '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' } 
                }}>
                  
                  <IconButton 
                    onClick={(e) => handleToggleWishlist(e, course.id)}
                    sx={{ 
                      position: 'absolute', 
                      top: 8, right: 8, 
                      backgroundColor: 'background.paper', 
                      boxShadow: 1,
                      zIndex: 2,
                      '&:hover': { backgroundColor: 'action.hover' } 
                    }}
                    size="small"
                  >
                    {isCourseFavorite ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon color="action" />}
                  </IconButton>

                  <Box sx={{ 
                      width: '100%',
                      height: 180, 
                      flexShrink: 0, 
                      backgroundImage: `url(${course.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: 'divider'
                  }} />
                  
                  <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                      <Chip label={course.category || 'Інше'} size="small" sx={{ backgroundColor: 'action.hover', fontWeight: 600, color: 'text.secondary' }} />
                      
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <StarIcon sx={{ color: 'warning.main', fontSize: 18, mr: 0.5 }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {Number(course.average_rating || 0).toFixed(1)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({course.review_count || 0})
                        </Typography>
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
                      <Chip label={course.level} size="small" variant="outlined" sx={{ fontWeight: 500, color: 'text.secondary', borderColor: 'divider' }} />
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
              );
            })
          ) : (
            <Box sx={{ gridColumn: '1 / -1', p: { xs: 3, sm: 8 }, textAlign: 'center', backgroundColor: 'background.paper', borderRadius: '16px', border: '1px dashed', borderColor: 'divider' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: 'text.primary' }}>Не знайшли те, що шукали?</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '600px', mx: 'auto' }}>
                За вибраними фільтрами немає курсів. Спробуйте змінити критерії пошуку або скористайтеся нашим розумним AI-Ментором, який підбере ідеальну програму саме для вас!
              </Typography>
              {/* Адаптивні кнопки для стану "Порожньо" */}
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'center' }}>
                <Button variant="outlined" fullWidth onClick={() => { setSelectedCategories([]); setSelectedLevel('Всі'); setSelectedPrice('Всі'); }} sx={{ borderRadius: '20px', px: 3, fontWeight: 600, textTransform: 'none' }}>
                  Очистити фільтри
                </Button>
                <Button 
                  variant="contained" 
                  fullWidth
                  startIcon={<AutoAwesomeIcon />}
                  onClick={() => navigate('/mentor')}
                  sx={{ 
                    background: 'linear-gradient(45deg, #7b1fa2 30%, #e91e63 90%)', 
                    color: 'white', borderRadius: '20px', px: 3, fontWeight: 700, textTransform: 'none',
                    boxShadow: '0 3px 15px rgba(233, 30, 99, 0.4)'
                  }}
                >
                  Запитати AI-Ментора
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Container>
  );
}