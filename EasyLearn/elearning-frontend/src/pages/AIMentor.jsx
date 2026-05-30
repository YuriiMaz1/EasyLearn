import React, { useState, useRef, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, IconButton, 
  CircularProgress, Avatar, Chip, Button, Grid, Card, CardContent, CardMedia,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Send as SendIcon, SmartToy as RobotIcon, Person as PersonIcon, 
  Error as ErrorIcon, AutoAwesome as SparkleIcon, Star as StarIcon,
  Search as SearchIcon, ReportProblem as WarningIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function AIMentor() {
  const navigate = useNavigate();
  // ДОДАНО: Отримуємо поточного юзера
  const user = JSON.parse(localStorage.getItem('user')); 

  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      isRawData: true,
      data: {
        status: 'clarifying',
        replyText: 'Привіт! Я AI-ментор платформи EasyLearn. Який напрямок ви хочете вивчити та який ваш поточний рівень?',
        options: ['Я новачок в ІТ', 'Шукаю поглиблені курси для роботи', 'Хочу вивчити Дизайн']
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (textOverride = null) => {
    const messageText = textOverride || input.trim();
    if (!messageText) return;

    const userMessage = { role: 'user', content: messageText };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textOverride) setInput('');
    setIsLoading(true);
    setIsFallbackMode(false);

    try {
      const historyForApi = newMessages.map(msg => ({
        role: msg.role,
        content: msg.isRawData ? msg.data.replyText : msg.content
      }));

      const response = await fetch('http://localhost:3000/api/mentor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ДОДАНО: передаємо student_id на бекенд
        body: JSON.stringify({ messages: historyForApi, student_id: user?.id }) 
      });
      
      const resData = await response.json();
      
      if (resData.success) {
        setMessages([...newMessages, { role: 'assistant', isRawData: true, data: resData.aiData }]);
      } else {
        setIsFallbackMode(true);
      }
    } catch (error) {
      console.error(error);
      setIsFallbackMode(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>AI Ментор</Typography>
        <Typography variant="body1" color="text.secondary">Розумний підбір найкращих курсів</Typography>
      </Box>

      <Paper elevation={4} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, backgroundColor: 'background.default' }}>
          {messages.map((msg, idx) => (
            <Box key={idx} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', mb: 4 }}>
              
              {msg.role === 'assistant' && (
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2, mt: 1 }}><RobotIcon /></Avatar>
              )}
              
              <Box sx={{ maxWidth: msg.role === 'user' ? '75%' : '90%' }}>
                {msg.role === 'user' ? (
                   <Paper sx={{ p: 2, backgroundColor: 'primary.main', color: 'primary.contrastText', borderRadius: '20px 20px 0 20px' }}>
                     <Typography>{msg.content}</Typography>
                   </Paper>
                ) : (
                  <Box>
                    <Paper sx={{ p: 2.5, backgroundColor: 'background.paper', borderRadius: '20px 20px 20px 0', mb: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: msg.data?.detected_level ? 1 : 0 }}>
                        {msg.isRawData ? msg.data.replyText : msg.content}
                      </Typography>
                      {msg.isRawData && msg.data.status === 'ready' && msg.data.detected_level && (
                        <Chip label={`Рівень: ${msg.data.detected_level}`} color="info" size="small" sx={{ fontWeight: 600 }} />
                      )}
                    </Paper>

                    {/* СТАН: Кнопки уточнення */}
                    {msg.isRawData && msg.data.status === 'clarifying' && msg.data.options && msg.data.options.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {msg.data.options.map((opt, i) => (
                          <Chip 
                            key={i} label={opt} onClick={() => handleSend(opt)} 
                            icon={<SparkleIcon fontSize="small" />} color="primary" variant="outlined" 
                            sx={{ fontWeight: 600, cursor: 'pointer', '&:hover': { backgroundColor: 'primary.main', color: 'white' } }} 
                          />
                        ))}
                      </Box>
                    )}

                    {/* СТАН: ТОП курси знайдено */}
                    {msg.isRawData && msg.data.status === 'ready' && msg.data.recommended_courses && msg.data.recommended_courses.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, ml: 1 }}>Рекомендовані курси:</Typography>
                        <Grid container spacing={2}>
                          {msg.data.recommended_courses.map((course) => (
                            <Grid item xs={12} sm={6} md={4} key={course.id}>
                              <Card 
                                onClick={() => navigate(`/course/${course.id}`)}
                                sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: '0.2s', border: '1px solid', borderColor: 'divider', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4, borderColor: 'primary.main' } }}
                              >
                                {course.image_url && <CardMedia component="img" height="120" image={course.image_url} />}
                                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 1 }}>{course.title}</Typography>
                                  <Chip label={course.category} size="small" sx={{ fontSize: '0.7rem' }} />
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    )}
                    {/* СТАН: Курси НЕ знайдено (Додано нову логіку) */}
                    {msg.isRawData && msg.data.status === 'ready' && (!msg.data.recommended_courses || msg.data.recommended_courses.length === 0) && (
                      <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(211, 47, 47, 0.05)', borderRadius: '12px', border: '1px dashed', borderColor: 'error.main' }}>
                        <Typography variant="subtitle2" sx={{ color: 'error.main', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                           <WarningIcon fontSize="small" /> На жаль, таких курсів поки що немає
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                           На нашій платформі ще немає курсу, який би ідеально відповідав цьому запиту. Спробуйте змінити напрямок або пошукати суміжні теми.
                        </Typography>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small" 
                          onClick={() => setMessages([{ 
                            role: 'assistant', isRawData: true,
                            data: { status: 'clarifying', replyText: 'Спробуємо знайти щось інше! Який ще напрямок вас цікавить?', options: ['Програмування', 'Дизайн', 'Менеджмент'] }
                          }])}
                          sx={{ mt: 2, textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                        >
                          Почати пошук спочатку
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              {msg.role === 'user' && (
                <Avatar sx={{ bgcolor: 'primary.main', ml: 2, mt: 1 }}><PersonIcon /></Avatar>
              )}
            </Box>
          ))}
          
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}><RobotIcon /></Avatar>
              <Paper sx={{ p: 2, borderRadius: '20px 20px 20px 0', display: 'flex', alignItems: 'center', backgroundColor: 'background.paper' }}>
                <CircularProgress size={20} sx={{ mr: 2 }} />
                <Typography color="text.secondary">AI аналізує запит...</Typography>
              </Paper>
            </Box>
          )}

          {/* ========================================== */}
          {/* БЛОК FALLBACK (ЯКЩО ШІ ВПАВ ЧЕРЕЗ ЛІМІТИ) */}
          {/* ========================================== */}
          {isFallbackMode && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 4, mt: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main', mr: 2, mt: 1 }}><WarningIcon /></Avatar>
              <Paper sx={{ p: 3, backgroundColor: 'warning.light', color: 'warning.contrastText', borderRadius: '20px 20px 20px 0', maxWidth: '85%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  Упс! Наш AI-ментор зараз перевантажений запитами. 🤖🔥
                </Typography>
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Але не хвилюйтеся, це не завадить вашому навчанню. Ми можемо перейти до класичного каталогу, де ви легко знайдете потрібний курс самостійно.
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button 
                    variant="contained" 
                    color="inherit" 
                    startIcon={<SearchIcon />}
                    onClick={() => navigate('/catalog')}
                    sx={{ color: 'warning.dark', fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}
                  >
                    Перейти до Каталогу курсів
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="inherit" 
                    onClick={() => {
                      setIsFallbackMode(false);
                      setMessages([{ 
                        role: 'assistant', isRawData: true,
                        data: { status: 'clarifying', replyText: 'Спробуємо ще раз! Який напрямок вас цікавить?', options: ['Програмування', 'Дизайн'] }
                      }]);
                    }}
                    sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
                  >
                    Спробувати AI ще раз
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* ПАНЕЛЬ ВВОДУ БЛОКУЄТЬСЯ, ЯКЩО АКТИВНИЙ FALLBACK */}
        <Box sx={{ p: 2, backgroundColor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            placeholder={isFallbackMode ? "ШІ тимчасово недоступний..." : "Введіть запит (напр: Хочу вивчити Python)"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            variant="outlined"
            disabled={isFallbackMode || isLoading}
            sx={{ mr: 2, '& .MuiOutlinedInput-root': { borderRadius: '24px' } }}
          />
          <IconButton 
            onClick={() => handleSend()} 
            disabled={!input.trim() || isLoading || isFallbackMode}
            sx={{ backgroundColor: isFallbackMode ? 'action.disabledBackground' : 'primary.main', color: 'white', '&:hover': { backgroundColor: 'primary.dark' }, width: '50px', height: '50px' }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Container>
  );
}