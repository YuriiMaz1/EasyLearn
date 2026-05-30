import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, Grid, 
  Select, MenuItem, InputLabel, FormControl, Card, CardContent, Alert,
  Dialog, DialogTitle, DialogContent, IconButton, List, ListItem, ListItemIcon, ListItemText, Divider, Radio, Chip, CircularProgress,
  Slider, Switch, FormControlLabel, Checkbox 
} from '@mui/material';

import { 
  Edit as EditIcon,
  Insights as InsightsIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  OndemandVideo as OndemandVideoIcon,
  Quiz as QuizIcon,
  Check as CheckIcon,
  AutoAwesome as AutoAwesomeIcon,
  CloudUpload as CloudUploadIcon,
  DragIndicator as DragIndicatorIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  
  const [user] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [myCourses, setMyCourses] = useState([]);
  const [formData, setFormData] = useState({
    title: '', description: '', image_url: '', duration: '', 
    category: 'Програмування', level: 'Для початківців', price: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [activeCourseTitle, setActiveCourseTitle] = useState('');

  const [selectedCourse, setSelectedCourse] = useState(null); 
  const [lessons, setLessons] = useState([]); 
  const [isEditingLesson, setIsEditingLesson] = useState(false); 
  const [lessonForm, setLessonForm] = useState({ id: null, title: '', video_url: '', content: '', order_number: 1 });
  const [quizQuestions, setQuizQuestions] = useState([]); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [quizCount, setQuizCount] = useState(3);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);

  // Стейт для Drag and Drop (Перетягування)
  const [draggedIndex, setDraggedIndex] = useState(null);

const fetchMyCourses = () => {
    if (!user || !user.id) return;
    
    const safeUserId = parseInt(user.id, 10);
    if (isNaN(safeUserId)) return;

    fetch(`http://localhost:3000/api/teacher/${safeUserId}/courses`)
      .then(res => res.json())
      .then(data => setMyCourses(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  const fetchLessons = (courseId) => {
    fetch(`http://localhost:3000/api/courses/${courseId}/lessons`)
      .then(res => res.json())
      .then(data => {
        // Обов'язково сортуємо по order_number
        const sorted = (Array.isArray(data) ? data : []).sort((a, b) => a.order_number - b.order_number);
        setLessons(sorted);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
      navigate('/');
      return;
    }
    fetchMyCourses();
  }, [user, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setFormData({ ...formData, image_url: '' }); 
    }
  };
const handleAiGenerate = async () => {
    // ТЕПЕРЬ ПУСКАЕТ, ЕСЛИ ЕСТЬ ЛИБО КОНСПЕКТ, ЛИБО ВИДЕО
    if (!lessonForm.title || (!lessonForm.content && !lessonForm.video_url)) {
      alert("Спочатку введіть назву та конспект уроку (або вкажіть URL відео), щоб ШІ міг створити питання!");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:3000/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseTitle: selectedCourse?.title || "Загальний курс", 
          lessonTitle: lessonForm.title,
          content: lessonForm.content,
          video_url: lessonForm.video_url, // ПЕРЕДАЕМ ССЫЛКУ НА ВИДЕО!
          count: quizCount,
          isMultiple: isMultipleChoice
        })
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.quiz)) {
        const formattedQuiz = data.quiz.map(q => ({
          question: q.question,
          options: q.options,
          correctIndexes: q.correctIndexes || (q.correctIndex !== undefined ? [q.correctIndex] : [0]),
          isMultiple: isMultipleChoice
        }));
        
        setQuizQuestions([...quizQuestions, ...formattedQuiz]);
      } else {
        alert("Помилка ШІ: " + (data.message || "Невірний формат даних"));
      }
    } catch (err) {
      console.error(err);
      alert("Не вдалося підключитися до сервера генерації.");
    } finally {
      setIsGenerating(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile && !formData.image_url) {
      alert("Будь ласка, завантажте обкладинку або вкажіть посилання на зображення!");
      return;
    }

    if (!imageFile && formData.image_url) {
      const imgRegex = /^https?:\/\/.+\.(jpg|jpeg|png|webp).*$/i;
      if (!imgRegex.test(formData.image_url)) {
        return alert("Помилка: Посилання має вести на пряме зображення у форматі .jpg, .png або .webp!");
      }
    }

    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('duration', formData.duration);
    formDataToSend.append('category', formData.category);
    formDataToSend.append('level', formData.level);
    formDataToSend.append('price', formData.price || 0);
    formDataToSend.append('teacher_id', user.id);
    
    if (imageFile) {
      formDataToSend.append('image_file', imageFile);
    } else {
      formDataToSend.append('image_url', formData.image_url);
    }

    try {
      const response = await fetch('http://localhost:3000/api/courses', {
        method: 'POST',
        body: formDataToSend 
      });
      const data = await response.json();
      
      if (data.success) {
        setFormData({ title: '', description: '', image_url: '', duration: '', category: 'Програмування', level: 'Для початківців', price: '' });
        setImageFile(null);
        setImagePreview('');
        fetchMyCourses();
        
        const createdCourseObj = {
            id: data.courseId,
            title: formData.title,
            image_url: imagePreview || formData.image_url
        };
        openCourseBuilder(createdCourseObj); 
      } else {
        alert(data.message || "Помилка при створенні курсу");
      }
    } catch (err) { console.error(err); }
  };

  const handleOpenAnalytics = (courseId, title) => {
    setActiveCourseTitle(title);
    fetch(`http://localhost:3000/api/analytics/${courseId}/funnel`)
      .then(res => res.json())
      .then(data => {
        setAnalyticsData(data);
        setAnalyticsOpen(true);
      })
      .catch(err => console.error(err));
  };

  const openCourseBuilder = (course) => {
    setSelectedCourse(course);
    fetchLessons(course.id);
    resetLessonForm();
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const closeCourseBuilder = () => {
    setSelectedCourse(null);
    setIsEditingLesson(false);
    fetchMyCourses(); 
  };

  const resetLessonForm = () => {
    setLessonForm({ id: null, title: '', video_url: '', content: '', order_number: lessons.length + 1 });
    setQuizQuestions([]);
    setIsEditingLesson(true);
  };

  const editLesson = (lesson) => {
    setLessonForm({ id: lesson.id, title: lesson.title, video_url: lesson.video_url || '', content: lesson.content || '', order_number: lesson.order_number });
    
    const parsedQuiz = lesson.quiz_data ? JSON.parse(lesson.quiz_data).map(q => ({
      ...q,
      correctIndexes: q.correctIndexes || (q.correctIndex !== undefined ? [q.correctIndex] : [0]),
      isMultiple: q.isMultiple || false
    })) : [];
    
    setQuizQuestions(parsedQuiz);
    setIsEditingLesson(true);
  };

  const addQuizQuestion = () => setQuizQuestions([...quizQuestions, { 
    question: '', options: ['', '', '', ''], correctIndexes: [0], isMultiple: isMultipleChoice 
  }]);
  
  const updateQuizQuestion = (qIndex, field, value) => {
    const updated = [...quizQuestions];
    updated[qIndex][field] = value;
    if (field === 'isMultiple') {
      updated[qIndex].correctIndexes = [0];
    }
    setQuizQuestions(updated);
  };

  const updateQuizOption = (qIndex, optIndex, value) => {
    const updated = [...quizQuestions];
    updated[qIndex].options[optIndex] = value;
    setQuizQuestions(updated);
  };

  const handleAnswerSelect = (qIndex, optIndex, isMultiple) => {
    const updated = [...quizQuestions];
    const q = updated[qIndex];
    if (isMultiple) {
      if (q.correctIndexes.includes(optIndex)) {
        q.correctIndexes = q.correctIndexes.filter(i => i !== optIndex);
      } else {
        q.correctIndexes.push(optIndex);
      }
    } else {
      q.correctIndexes = [optIndex];
    }
    setQuizQuestions(updated);
  };

  const removeQuizQuestion = (qIndex) => setQuizQuestions(quizQuestions.filter((_, i) => i !== qIndex));

  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) return alert("Введіть назву уроку!");

    if (lessonForm.video_url && lessonForm.video_url.trim() !== '') {
      const ytRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      if (!ytRegex.test(lessonForm.video_url)) {
        return alert("Помилка: Вставте коректне посилання саме на відео YouTube!");
      }
    }

    const payload = {
      course_id: selectedCourse.id,
      title: lessonForm.title,
      video_url: lessonForm.video_url || null, 
      content: lessonForm.content || null,      
      order_number: lessonForm.order_number || 1,
      quiz_data: quizQuestions.length > 0 ? quizQuestions : null
    };

    const url = lessonForm.id ? `http://localhost:3000/api/lessons/${lessonForm.id}` : 'http://localhost:3000/api/lessons';
    const method = lessonForm.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        fetchLessons(selectedCourse.id);
        setIsEditingLesson(false);
      } else { alert("Помилка БД: " + data.message); }
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // ЛОГІКА ЗМІНИ ПОРЯДКУ УРОКІВ (DRAG & DROP)
  // ==========================================
  const saveReorderedLessons = async (reorderedLessons) => {
    setLessons(reorderedLessons); // Оновлюємо UI миттєво
    
    // Формуємо масив з новими порядковими номерами
    const payload = reorderedLessons.map((lesson, idx) => ({
      id: lesson.id,
      order_number: idx + 1
    }));

    try {
      await fetch('http://localhost:3000/api/lessons/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessons: payload })
      });
    } catch (err) {
      console.error("Помилка збереження порядку:", err);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    // Додаємо ефект напівпрозорості під час перетягування
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Дозволяємо скидання елемента
  };

  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const items = [...lessons];
    const draggedItem = items[draggedIndex];
    
    items.splice(draggedIndex, 1); // Видаляємо зі старого місця
    items.splice(index, 0, draggedItem); // Вставляємо на нове
    
    saveReorderedLessons(items);
    setDraggedIndex(null);
  };

  // Логіка для кнопок "Вгору" / "Вниз" (якщо викладачу незручно тягнути)
  const moveLessonPosition = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === lessons.length - 1)) return;
    
    const items = [...lessons];
    const current = items[index];
    const target = items[index + direction];
    
    items[index] = target;
    items[index + direction] = current;
    
    saveReorderedLessons(items);
  };

  if (!user) return null;

  const maxStudents = analyticsData.length > 0 ? Math.max(...analyticsData.map(d => d.completed_count)) : 0;

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 10 }}>
      {!selectedCourse ? (
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 4, color: 'text.primary' }}>Панель Викладача</Typography>
          <Grid container spacing={5}>
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Крок 1: Загальна інформація</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Заповніть базові дані, щоб перейти до додавання уроків.</Typography>
                
                <form onSubmit={handleSubmit}>
                  <TextField fullWidth label="Назва курсу" name="title" value={formData.title} onChange={handleChange} required sx={{ mb: 2 }} />
                  <TextField fullWidth label="Короткий опис" name="description" value={formData.description} onChange={handleChange} multiline rows={3} required sx={{ mb: 2 }} />
                  
                  <Box sx={{ mb: 2, border: '2px dashed', borderColor: 'divider', borderRadius: '8px', p: 3, textAlign: 'center', backgroundColor: 'background.default' }}>
                    {imagePreview ? (
                      <Box>
                        <Box component="img" src={imagePreview} alt="Preview" sx={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', mb: 2, border: '1px solid', borderColor: 'divider' }} />
                        <Button variant="outlined" component="label" size="small" sx={{ textTransform: 'none', borderRadius: '8px' }}>
                          Змінити зображення
                          <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <CloudUploadIcon color="primary" sx={{ fontSize: 40 }} />
                        <Typography variant="body2" color="text.secondary">Завантажте обкладинку курсу</Typography>
                        <Button variant="contained" component="label" size="small" sx={{ mt: 1, textTransform: 'none', borderRadius: '8px' }}>
                          Обрати файл
                          <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>або вкажіть URL нижче</Typography>
                      </Box>
                    )}
                  </Box>

                  <TextField fullWidth label="URL обкладинки (якщо немає файлу)" name="image_url" value={formData.image_url} onChange={handleChange} sx={{ mb: 2 }} placeholder="https://..." disabled={!!imageFile} />
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}><TextField fullWidth label="Тривалість" name="duration" value={formData.duration} onChange={handleChange} placeholder="напр. 15 год." required /></Grid>
                    <Grid item xs={6}><TextField fullWidth label="Ціна (грн)" name="price" type="number" value={formData.price} onChange={handleChange} placeholder="0 для безкоштовних" /></Grid>
                  </Grid>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Категорія</InputLabel>
                    <Select name="category" value={formData.category} onChange={handleChange} label="Категорія">
                      <MenuItem value="Програмування">Програмування</MenuItem>
                      <MenuItem value="Дизайн">Дизайн</MenuItem>
                      <MenuItem value="Менеджмент">Менеджмент</MenuItem>
                      <MenuItem value="Маркетинг">Маркетинг</MenuItem>
                      <MenuItem value="Інше">Інше</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 4 }}>
                    <InputLabel>Рівень</InputLabel>
                    <Select name="level" value={formData.level} onChange={handleChange} label="Рівень">
                      <MenuItem value="Для початківців">Для початківців</MenuItem>
                      <MenuItem value="Середній рівень">Середній рівень</MenuItem>
                      <MenuItem value="Просунутий">Просунутий</MenuItem>
                    </Select>
                  </FormControl>

                  <Button type="submit" variant="contained" color="primary" size="large" endIcon={<ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />} fullWidth sx={{ fontWeight: 700, py: 1.5, textTransform: 'none', borderRadius: '8px' }}>
                    Зберегти та перейти до уроків
                  </Button>
                </form>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>Мої існуючі курси ({myCourses.length})</Typography>
              
              {myCourses.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
                  {myCourses.map(course => (
                    <Card key={course.id} sx={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: '10px', border: '1px solid', borderColor: 'divider', boxShadow: 'none', backgroundColor: 'background.paper', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                      <Box sx={{ width: '100%', height: 130, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid', borderColor: 'divider' }} />
                      <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2, '&:last-child': { pb: 2 }, minWidth: 0 }}>
                        <Typography noWrap variant="caption" color="primary" sx={{ fontWeight: 800, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>{course.category}</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1.5, flexGrow: 1, wordBreak: 'break-word', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'text.primary' }}>{course.title}</Typography>
                        <Typography variant="caption" color={course.status === 'published' ? 'success.main' : 'warning.main'} sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, mb: 2, backgroundColor: course.status === 'published' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(237, 108, 2, 0.1)', width: 'fit-content', px: 1, py: 0.3, borderRadius: '4px' }}>
                          {course.status === 'published' ? 'Опубліковано' : 'На модерації'}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                          <Button variant="contained" size="small" startIcon={<EditIcon sx={{ fontSize: 16 }} />} onClick={() => openCourseBuilder(course)} sx={{ textTransform: 'none', borderRadius: '6px', fontWeight: 600, flexGrow: 1, fontSize: '0.75rem', py: 0.5, boxShadow: 'none' }}>
                            Уроки
                          </Button>
                          <Button variant="outlined" color="secondary" size="small" startIcon={<InsightsIcon sx={{ fontSize: 16 }} />} onClick={() => handleOpenAnalytics(course.id, course.title)} sx={{ textTransform: 'none', borderRadius: '6px', fontWeight: 600, flexGrow: 1, fontSize: '0.75rem', py: 0.5 }}>
                            Аналітика
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Paper elevation={0} sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: '12px', backgroundColor: 'background.paper' }}>
                  <Typography color="text.secondary">Ви ще не додали жодного курсу.</Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 50, height: 50, borderRadius: '8px', backgroundImage: `url(${selectedCourse.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>Крок 2: Наповнення курсу</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>{selectedCourse.title}</Typography>
              </Box>
            </Box>
            <Button variant="contained" color="success" startIcon={<CheckIcon />} onClick={closeCourseBuilder} sx={{ fontWeight: 700, borderRadius: '8px' }}>
              Завершити роботу над курсом
            </Button>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Програма</Typography>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={resetLessonForm} sx={{ textTransform: 'none', borderRadius: '8px' }}>Новий урок</Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {/* ОНОВЛЕНИЙ СПИСОК УРОКІВ ІЗ DRAG & DROP */}
                {lessons.length > 0 ? (
                  <List disablePadding>
                    {lessons.map((lesson, index) => (
                      <ListItem 
                        key={lesson.id} 
                        button 
                        draggable // Дозволяємо перетягування
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        onClick={() => editLesson(lesson)} 
                        sx={{ 
                          borderRadius: '8px', mb: 1, 
                          backgroundColor: lessonForm.id === lesson.id ? 'action.selected' : 'transparent', 
                          border: '1px solid', 
                          borderColor: lessonForm.id === lesson.id ? 'primary.main' : 'divider',
                          cursor: 'grab', // Візуальний курсор
                          opacity: draggedIndex === index ? 0.5 : 1, // Напівпрозорість при перетягуванні
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Іконка-ручка для перетягування */}
                        <ListItemIcon sx={{ minWidth: '30px', cursor: 'grab' }}>
                          <DragIndicatorIcon color="action" fontSize="small" />
                        </ListItemIcon>
                        
                        <ListItemText 
                          primary={`${index + 1}. ${lesson.title}`} 
                          secondary={lesson.quiz_data ? 'Відео + Тест' : (lesson.video_url ? 'Відео' : 'Текст')} 
                          primaryTypographyProps={{ fontWeight: 600, color: 'text.primary', noWrap: true }}
                          secondaryTypographyProps={{ color: 'text.secondary' }}
                        />
                        
                        {/* Кнопки Вгору / Вниз */}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <IconButton 
                            size="small" 
                            disabled={index === 0}
                            onClick={(e) => { e.stopPropagation(); moveLessonPosition(index, -1); }}
                            sx={{ p: 0 }}
                          >
                            <KeyboardArrowUpIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            disabled={index === lessons.length - 1}
                            onClick={(e) => { e.stopPropagation(); moveLessonPosition(index, 1); }}
                            sx={{ p: 0 }}
                          >
                            <KeyboardArrowDownIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" variant="body2" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>Уроків ще немає. Створіть свій перший урок праворуч ➔</Typography>
                )}
                {lessons.length > 1 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
                    * Затисніть та перетягніть урок або використовуйте стрілочки, щоб змінити порядок
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={8}>
              {isEditingLesson ? (
                <Paper sx={{ p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', position: 'relative' }}>
                  {lessonForm.id && (
                    <Chip label="Режим редагування" color="primary" size="small" sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 700 }} />
                  )}
                  
                  <Typography variant="h5" sx={{ fontWeight: 800, mb: 3, color: 'text.primary' }}>
                    {lessonForm.id ? 'Редагувати урок' : 'Створити новий урок'}
                  </Typography>

                  <TextField fullWidth label="Назва уроку *" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} sx={{ mb: 3 }} required />
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                    <OndemandVideoIcon color="error" fontSize="large" />
                    <TextField fullWidth label="URL відео на YouTube (необов'язково)" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="https://www.youtube.com/watch?v=..." />
                  </Box>

                  <TextField fullWidth multiline rows={6} label="Текстовий конспект / Теорія уроку (необов'язково)" value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} sx={{ mb: 4 }} />

                  <Box sx={{ backgroundColor: 'action.hover', p: 3, borderRadius: '12px', border: '1px solid', borderColor: 'divider', mb: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                      <QuizIcon color="secondary" />
                      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Тестові питання</Typography>
                    </Box>

                    <Box sx={{ mb: 3, p: 2, backgroundColor: 'action.selected', borderRadius: '8px', border: '1px dashed', borderColor: 'primary.main' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>Налаштування ШІ генератора:</Typography>
                      <Grid container spacing={3} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>Кількість питань: {quizCount}</Typography>
                          <Slider 
                            value={quizCount} 
                            onChange={(e, val) => setQuizCount(val)} 
                            step={1} min={1} max={10} 
                            valueLabelDisplay="auto"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={<Switch checked={isMultipleChoice} onChange={(e) => setIsMultipleChoice(e.target.checked)} color="primary" />}
                            label={<Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>Множинний вибір</Typography>}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
                      <Button 
                        type="button"
                        variant="contained" 
                        size="small"
                        disabled={isGenerating}
                        onClick={handleAiGenerate}
                        startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}
                        sx={{ 
                          background: 'linear-gradient(45deg, #9c27b0 30%, #f50057 90%)',
                          color: 'white',
                          textTransform: 'none',
                          fontWeight: 700,
                          flexGrow: 1,
                          py: 1
                        }}
                      >
                        {isGenerating ? 'Генеруємо...' : 'Згенерувати через ШІ'}
                      </Button>
                      <Button variant="outlined" color="secondary" size="small" startIcon={<AddIcon />} onClick={addQuizQuestion} sx={{ textTransform: 'none', py: 1 }}>
                        Додати вручну
                      </Button>
                    </Box>
                    
                    {quizQuestions.map((q, qIndex) => (
                      <Paper key={qIndex} elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: '8px', backgroundColor: 'background.paper' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>Питання {qIndex + 1}</Typography>
                            <FormControlLabel
                              control={
                                <Switch 
                                  size="small" 
                                  checked={q.isMultiple || false} 
                                  onChange={(e) => updateQuizQuestion(qIndex, 'isMultiple', e.target.checked)} 
                                />
                              }
                              label={<Typography variant="caption" color="text.secondary">Дозволити кілька відповідей</Typography>}
                            />
                          </Box>
                          <IconButton size="small" color="error" onClick={() => removeQuizQuestion(qIndex)}><DeleteIcon /></IconButton>
                        </Box>
                        
                        <TextField fullWidth size="small" label="Запитання" value={q.question} onChange={(e) => updateQuizQuestion(qIndex, 'question', e.target.value)} sx={{ mb: 3 }} required />
                        
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>Варіанти відповідей (виберіть правильні):</Typography>
                        {q.options.map((opt, optIndex) => (
                          <Box key={optIndex} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                            {q.isMultiple ? (
                              <Checkbox 
                                checked={q.correctIndexes?.includes(optIndex) || false} 
                                onChange={() => handleAnswerSelect(qIndex, optIndex, true)} 
                                color="success" 
                              />
                            ) : (
                              <Radio 
                                checked={q.correctIndexes?.includes(optIndex) || false} 
                                onChange={() => handleAnswerSelect(qIndex, optIndex, false)} 
                                color="success" 
                              />
                            )}
                            <TextField fullWidth size="small" placeholder={`Варіант ${optIndex + 1}`} value={opt} onChange={(e) => updateQuizOption(qIndex, optIndex, e.target.value)} required />
                          </Box>
                        ))}
                      </Paper>
                    ))}
                  </Box>

                  <Button variant="contained" color="primary" size="large" fullWidth onClick={handleSaveLesson} sx={{ fontWeight: 700, borderRadius: '8px', py: 1.5, textTransform: 'none' }}>
                    {lessonForm.id ? 'Оновити урок' : 'Зберегти урок у програму'}
                  </Button>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '300px', backgroundColor: 'background.paper', borderRadius: '12px', border: '1px dashed', borderColor: 'divider' }}>
                  <Typography color="text.secondary" variant="h6">Оберіть урок зі списку ліворуч або створіть новий</Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Модалка Аналітики (Залишилась без змін) */}
      <Dialog open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { backgroundColor: 'background.paper' } }}>
        <DialogTitle sx={{ m: 0, p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Теплова карта курсу</Typography>
            <Typography variant="body2" color="text.secondary">"{activeCourseTitle}"</Typography>
          </Box>
          <IconButton onClick={() => setAnalyticsOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 2 }}>
          {analyticsData.length === 0 ? (
            <Typography sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>У цьому курсі ще немає уроків або студентів.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
              {analyticsData.map((lesson) => {
                const retentionPercent = maxStudents > 0 ? Math.round((lesson.completed_count / maxStudents) * 100) : 0;
                
                const barColor = retentionPercent > 70 
                  ? 'success.main' 
                  : retentionPercent > 40 
                    ? 'warning.main' 
                    : 'error.main';

                return (
                  <Box key={lesson.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>Урок {lesson.order_number}: {lesson.title}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: barColor }}>
                        {lesson.completed_count} студ. ({retentionPercent}%)
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', backgroundColor: 'action.hover', borderRadius: '8px', height: '24px', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ width: `${retentionPercent}%`, backgroundColor: barColor, height: '100%', transition: 'width 1s ease-in-out' }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}