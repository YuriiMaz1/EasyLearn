import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, Box, Card, CardContent, CardMedia, Button, Paper, CircularProgress, LinearProgress, Avatar, Tooltip } from '@mui/material';
import { SportsEsports as BattleIcon, Timer as TimerIcon, Person as PersonIcon, Android as BotIcon, EmojiEvents as WinIcon, MoodBad as LoseIcon, Lock as LockIcon, VerifiedUser as RealUserIcon } from '@mui/icons-material';

export default function Arena() {
  const [courses, setCourses] = useState([]);
  const [gameState, setGameState] = useState('selection'); 
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [battleData, setBattleData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const timerRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:3000/api/arena/courses/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) setCourses(data.courses);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      handleAnswer(-1); 
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, gameState]);

  const startSearch = (course) => {
    setSelectedCourse(course);
    setGameState('searching');

    setTimeout(() => {
      fetch('http://localhost:3000/api/arena/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: course.id, student_id: user.id }) 
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setBattleData(data);
            setCurrentQ(0);
            setScore(0);
            setTotalTimeSpent(0);
            setTimeLeft(10);
            setGameState('playing');
          } else {
            alert(data.message || "Помилка зв'язку з сервером");
            setGameState('selection');
          }
        })
        .catch(() => {
            alert("Помилка мережі. Спробуйте пізніше.");
            setGameState('selection');
        });
    }, 2500);
  };

  const handleAnswer = (index) => {
    clearTimeout(timerRef.current);
    
    const timeSpentOnQuestion = 10 - timeLeft;
    const newTotalTime = totalTimeSpent + timeSpentOnQuestion;
    setTotalTimeSpent(newTotalTime);

    const correct = battleData.quiz[currentQ].correctIndex;
    let newScore = score;
    
    if (index === correct) {
      newScore = score + 1;
      setScore(newScore);
    }

    if (currentQ < battleData.quiz.length - 1) {
      setCurrentQ(prev => prev + 1);
      setTimeLeft(10); 
    } else {
      setGameState('results');
      
      fetch('http://localhost:3000/api/arena/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          student_name: user.full_name || 'Анонім',
          score: newScore,
          time_spent: newTotalTime
        })
      }).catch(err => console.error("Помилка збереження результату", err));
    }
  };

  if (isLoading) return <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 10, overflowX: 'hidden' }}>
      
      {/* СЦЕНА 1: ВИБІР КУРСУ */}
      {gameState === 'selection' && (
        <Box>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>⚔️ ПВП-Арена Знань</Typography>
            <Typography variant="body1" color="text.secondary">Оберіть пройдений курс, щоб викликати іншого студента на інтелектуальну дуель</Typography>
          </Box>

          {courses.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
              <Typography color="text.secondary">Ви ще не записані на жоден курс. Купіть курс у каталозі, щоб відкрити доступ до Арени!</Typography>
            </Paper>
          ) : (
            /* ЗАЛІЗОБЕТОННА СІТКА КАРТОК ЧЕРЕЗ CSS GRID */
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, 
              gap: 3 
            }}>
              {courses.map(course => (
                <Card key={course.id} sx={{ 
                  height: '340px', // Жорстка висота
                  position: 'relative', // Для абсолютного позиціонування кнопки
                  borderRadius: '12px',
                  border: '1px solid', 
                  borderColor: 'divider', 
                  boxShadow: 'none',
                  overflow: 'hidden'
                }}>
                  {/* ЖОРСТКА КАРТИНКА */}
                  {course.image_url ? (
                    <CardMedia 
                      component="img" 
                      image={course.image_url} 
                      sx={{ height: '150px', width: '100%', objectFit: 'cover', display: 'block' }} 
                    />
                  ) : (
                    <Box sx={{ height: '150px', width: '100%', backgroundColor: 'action.hover', display: 'block' }} />
                  )}
                  
                  {/* ЖОРСТКИЙ КОНТЕНТ */}
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '1.1rem',
                        lineHeight: '1.4', 
                        height: '2.8em', // Місце рівно під 2 рядки
                        display: '-webkit-box',
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                        m: 0
                      }}
                    >
                      {course.title}
                    </Typography>
                  </CardContent>

                  {/* КНОПКА ПРИБИТА ДО НИЗУ */}
                  <Box sx={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                    {course.eligible_lessons > 0 ? (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth 
                        startIcon={<BattleIcon />} 
                        onClick={() => startSearch(course)} 
                        sx={{ textTransform: 'none', fontWeight: 600, height: '45px', borderRadius: '8px' }}
                      >
                        В бій за цим курсом
                      </Button>
                    ) : (
                      <Tooltip title="Щоб битися на Арені, вам потрібно пройти хоча б один відеоурок із цього курсу" arrow placement="top">
                        <span>
                          <Button 
                            variant="outlined" 
                            color="inherit" 
                            fullWidth 
                            startIcon={<LockIcon />} 
                            disabled
                            sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: 'action.hover', height: '45px', borderRadius: '8px' }}
                          >
                            Спочатку пройдіть уроки
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* СЦЕНА 2: ПОШУК */}
      {gameState === 'searching' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, textAlign: 'center' }}>
          <CircularProgress size={80} thickness={4} sx={{ mb: 4 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Шукаємо суперника на Арені...</Typography>
          <Typography color="text.secondary">Ми підбираємо результат останнього реального гравця...</Typography>
        </Box>
      )}

      {/* СЦЕНА 3: БЛІЦ */}
      {gameState === 'playing' && battleData && (
        <Box maxWidth="md" sx={{ mx: 'auto' }}>
          <Paper sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Питання {currentQ + 1} з {battleData.quiz.length}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: timeLeft <= 3 ? 'error.main' : 'primary.main' }}>
              <TimerIcon />
              <Typography sx={{ fontWeight: 800, fontSize: '1.2rem' }}>{timeLeft}с</Typography>
            </Box>
          </Paper>

          <LinearProgress variant="determinate" value={(timeLeft / 10) * 100} color={timeLeft <= 3 ? "error" : "primary"} sx={{ height: 6, borderRadius: 3, mb: 4 }} />

          {/* ЖОРСТКИЙ БЛОК ПИТАННЯ */}
          <Paper sx={{ 
            height: '160px', 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            p: 3, 
            textAlign: 'center', 
            mb: 4, 
            borderRadius: '16px', 
            border: '1px solid', 
            borderColor: 'divider',
            overflow: 'hidden'
          }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                mb: 1,
                display: '-webkit-box',
                WebkitLineClamp: 3, 
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {battleData.quiz[currentQ].question}
            </Typography>
            <Typography variant="caption" color="text.secondary">Тема: {battleData.lessonTitle}</Typography>
          </Paper>

          {/* ЗАЛІЗОБЕТОННА СІТКА КНОПОК ЧЕРЕЗ CSS GRID */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
            gap: 2 
          }}>
            {battleData.quiz[currentQ].options.map((option, idx) => (
              <Button 
                key={idx}
                variant="outlined" 
                onClick={() => handleAnswer(idx)} 
                sx={{ 
                  height: '90px', // Жорстка висота
                  p: 2, 
                  textTransform: 'none', 
                  borderRadius: '12px', 
                  border: '2px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'flex-start', // Текст починається зверху
                  justifyContent: 'flex-start', // Текст починається зліва
                  textAlign: 'left',
                  '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' } 
                }}
              >
                <Typography sx={{ 
                  fontSize: '1.05rem', 
                  fontWeight: 600, 
                  lineHeight: 1.2,
                  display: '-webkit-box',
                  WebkitLineClamp: 3, // Максимум 3 рядки
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  width: '100%'
                }}>
                  {idx + 1}. {option}
                </Typography>
              </Button>
            ))}
          </Box>
        </Box>
      )}

      {/* СЦЕНА 4: РЕЗУЛЬТАТИ */}
      {gameState === 'results' && battleData && (() => {
        const isWin = score > battleData.opponent.correctAnswers || (score === battleData.opponent.correctAnswers && totalTimeSpent < battleData.opponent.timeSpent);
        return (
          <Box maxWidth="sm" sx={{ mx: 'auto', textAlign: 'center' }}>
            <Paper sx={{ p: 5, borderRadius: '24px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
              {isWin ? <WinIcon sx={{ fontSize: 90, color: '#ffb300', mb: 2 }} /> : <LoseIcon sx={{ fontSize: 90, color: '#d32f2f', mb: 2 }} />}
              <Typography variant="h4" sx={{ fontWeight: 900, mb: 4 }}>{isWin ? "🏆 ВИ ПЕРЕМОГЛИ!" : "💀 ПОРАЗКА"}</Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3, mb: 4 }}>
                <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: '12px' }}>
                  <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: 'primary.main' }}><PersonIcon /></Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Ви</Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>{score} / 5</Typography>
                  <Typography variant="caption" color="text.secondary">{totalTimeSpent} секунд</Typography>
                </Box>
                <Box sx={{ p: 2, backgroundColor: 'action.hover', borderRadius: '12px', position: 'relative' }}>
                  {battleData.opponent.isReal && (
                    <Tooltip title="Це результат реальної людини, яка щойно грала цей курс!" placement="top">
                      <RealUserIcon sx={{ position: 'absolute', top: 10, right: 10, color: 'success.main', fontSize: 20 }} />
                    </Tooltip>
                  )}
                  <Avatar sx={{ mx: 'auto', mb: 1, bgcolor: battleData.opponent.isReal ? 'success.main' : 'secondary.main' }}>
                    {battleData.opponent.isReal ? <PersonIcon /> : <BotIcon />}
                  </Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{battleData.opponent.name}</Typography>
                  <Typography variant="h6" color="secondary" sx={{ fontWeight: 800 }}>{battleData.opponent.correctAnswers} / 5</Typography>
                  <Typography variant="caption" color="text.secondary">{battleData.opponent.timeSpent} секунд</Typography>
                </Box>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                {isWin ? `Чудова робота! Ви виявилися швидшими та точнішими за супротивника. Ваш результат збережено для наступних гравців!` : `Не засмучуйтесь! Перегляньте відеоматеріали курсу ще раз, щоб підтягнути знання.`}
              </Typography>

              <Button variant="contained" size="large" fullWidth onClick={() => setGameState('selection')} sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
                Повернутися до вибору курсів
              </Button>
            </Paper>
          </Box>
        );
      })()}

    </Container>
  );
}