import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Container, Typography, Box, Paper, List, ListItem, ListItemButton, 
  ListItemText, ListItemIcon, Divider, Button, LinearProgress, TextField, 
  Avatar, Chip, IconButton, Radio, RadioGroup, FormControlLabel, FormControl, FormLabel, Alert,
  Dialog, DialogTitle, DialogContent, Checkbox, FormGroup 
} from '@mui/material';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SendIcon from '@mui/icons-material/Send';
import ReplyIcon from '@mui/icons-material/Reply';
import CloseIcon from '@mui/icons-material/Close';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import QuizIcon from '@mui/icons-material/Quiz';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useParams, useNavigate } from 'react-router-dom';

import ReviewsSection from '../components/ReviewsSection';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function Lesson() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  
  const [courseTitle, setCourseTitle] = useState(''); 
  const [courseAuthorId, setCourseAuthorId] = useState(null); 
  
  const [lessons, setLessons] = useState([]);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [progressPercent, setProgressPercent] = useState(0);

  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  
  const [cheatWarning, setCheatWarning] = useState(false); 

  const progressInterval = useRef(null);
  const playerRef = useRef(null);
  const videoContainerRef = useRef(null);
  const maxTimeReached = useRef(0); 
  const courseAuthorIdRef = useRef(null); 

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const user = useMemo(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  }, []);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }

    fetch(`http://localhost:3000/api/courses/${courseId}`)
      .then(res => res.json())
      .then(data => {
        setCourseTitle(data.title);
        setCourseAuthorId(data.teacher_id); 
        courseAuthorIdRef.current = data.teacher_id; 
      });

    fetch(`http://localhost:3000/api/courses/${courseId}/lessons`)
      .then(res => res.json())
      .then(data => {
        const parsedData = data.map(l => ({ ...l, quiz_data: l.quiz_data ? JSON.parse(l.quiz_data) : [] }));
        setLessons(parsedData);
        setCurrentLesson(prev => prev || (parsedData.length > 0 ? parsedData[0] : null)); 
      });

    fetch(`http://localhost:3000/api/progress/${courseId}/${user.id}`)
      .then(res => res.json())
      .then(data => setCompletedLessonIds(data));

  }, [courseId, user, navigate]);

  useEffect(() => {
    if (lessons.length > 0) {
      setProgressPercent(Math.round((completedLessonIds.length / lessons.length) * 100));
    }
  }, [completedLessonIds, lessons]);

  useEffect(() => {
    if (currentLesson) {
      fetchComments();
      setReplyingTo(null);
      setNewComment('');
      setQuizAnswers({});
      setQuizResult(null);

      setCheatWarning(false);

      const isCompleted = completedLessonIds.includes(currentLesson.id);
      setIsVideoWatched(isCompleted);
      setVideoProgress(isCompleted ? 1 : 0);
    }
  }, [currentLesson?.id]); 

  useEffect(() => {
    if (!currentLesson) return;

    const videoId = getYouTubeVideoId(currentLesson.video_url);
    let timeoutId;

    if (videoId) {
      const initYT = () => {
        if (window.YT && window.YT.Player && videoContainerRef.current) {
          
          if (playerRef.current) {
            playerRef.current.destroy();
          }

          const storageKey = `videoProgress_${user?.id}_${currentLesson.id}`;
          const savedTime = localStorage.getItem(storageKey) || 0;
          maxTimeReached.current = parseFloat(savedTime);

          videoContainerRef.current.innerHTML = '';
          const ytDiv = document.createElement('div');
          ytDiv.style.width = '100%';
          ytDiv.style.height = '100%';
          videoContainerRef.current.appendChild(ytDiv);

          playerRef.current = new window.YT.Player(ytDiv, {
            videoId: videoId,
            playerVars: {
              rel: 0,
              enablejsapi: 1,
              origin: window.location.origin,
              start: Math.floor(maxTimeReached.current),
              modestbranding: 1, 
              fs: 0,             
              disablekb: 1,
              controls: 1,
              playsinline: 1 
            },
            events: {
              'onReady': () => {
                clearInterval(progressInterval.current);
                progressInterval.current = setInterval(() => {
                  if (playerRef.current && playerRef.current.getPlayerState) {
                    const state = playerRef.current.getPlayerState();
                    const currentTime = playerRef.current.getCurrentTime();
                    const duration = playerRef.current.getDuration();

                    const isPrivileged = user?.role === 'admin' || (user?.role === 'teacher' && user?.id === courseAuthorIdRef.current);

                    // Логіка анти-скіпу працює надійно і без фізичного щита
                    if (!isPrivileged && currentTime > maxTimeReached.current + 3) {
                      playerRef.current.seekTo(maxTimeReached.current, true);
                      setCheatWarning(true); 
                    } else {
                      if (currentTime > maxTimeReached.current) {
                        maxTimeReached.current = currentTime;
                        localStorage.setItem(storageKey, maxTimeReached.current);
                      }
                    }

                    if (state === window.YT.PlayerState.PLAYING) {
                      if (duration > 0) {
                        const progress = maxTimeReached.current / duration; 
                        setVideoProgress(progress);
                        
                        if (progress >= 0.9) {
                          setIsVideoWatched(true);
                        }
                      }
                    }
                  }
                }, 1000);
              }
            }
          });
        } else {
          timeoutId = setTimeout(initYT, 500);
        }
      };
      
      initYT();
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(progressInterval.current);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentLesson?.id, user]); 

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isPrivileged = user?.role === 'admin' || (user?.role === 'teacher' && user?.id === courseAuthorId);
      
      if (document.hidden && !isPrivileged) {
        if (playerRef.current && playerRef.current.getPlayerState) {
          const state = playerRef.current.getPlayerState();
          if (state === window.YT.PlayerState.PLAYING) {
            playerRef.current.pauseVideo();
            setCheatWarning(true); 
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentLesson, user, courseAuthorId]);

  const fetchComments = () => {
    fetch(`http://localhost:3000/api/lessons/${currentLesson.id}/comments`)
      .then(res => res.json())
      .then(data => setComments(data))
      .catch(err => console.error(err));
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    try {
      const response = await fetch('http://localhost:3000/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson_id: currentLesson.id, user_id: user.id, comment_text: newComment, parent_id: replyingTo ? replyingTo.id : null })
      });
      if ((await response.json()).success) {
        setNewComment('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (err) { console.error(err); }
  };

  const currentIndex = currentLesson ? lessons.findIndex(l => l.id === currentLesson.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < lessons.length - 1;

  const goPrev = () => { setCurrentLesson(lessons[currentIndex - 1]); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const goNext = () => { setCurrentLesson(lessons[currentIndex + 1]); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const completeLessonCore = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/lessons/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.id, lesson_id: currentLesson.id, course_id: courseId })
      });
      
      if ((await res.json()).success) {
        localStorage.removeItem(`videoProgress_${user?.id}_${currentLesson.id}`);

        const updatedCompletedIds = [...new Set([...completedLessonIds, currentLesson.id])];
        setCompletedLessonIds(updatedCompletedIds);
        
        const isCourseFullyCompleted = updatedCompletedIds.length === lessons.length;
        
        if (isCourseFullyCompleted) {
          setFinishDialogOpen(true);
        } else {
          setTimeout(() => { if (hasNext) goNext(); }, 1500);
        }
      }
    } catch (error) { console.error(error); }
  };

  const handleOptionToggle = (qIndex, optIndex, isMultipleChoice) => {
    setQuizAnswers(prev => {
      const currentSelections = prev[qIndex] || [];
      if (isMultipleChoice) {
        if (currentSelections.includes(optIndex)) {
          return { ...prev, [qIndex]: currentSelections.filter(i => i !== optIndex) };
        } else {
          return { ...prev, [qIndex]: [...currentSelections, optIndex] };
        }
      } else {
        return { ...prev, [qIndex]: [optIndex] };
      }
    });
  };

  const handleSubmitQuiz = () => {
    if (!currentLesson.quiz_data) return;
    let correctCount = 0;

    currentLesson.quiz_data.forEach((q, index) => {
      const userAnswers = quizAnswers[index] || [];
      const correctAnswers = q.correctIndexes || [];

      if (
        userAnswers.length === correctAnswers.length &&
        correctAnswers.every(val => userAnswers.includes(val))
      ) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / currentLesson.quiz_data.length) * 100);
    
    if (score >= 80) {
      setQuizResult({ score, passed: true });
      completeLessonCore(); 
    } else {
      setQuizResult({ score, passed: false });
    }
  };

  const generateCertificate = () => {
    const certElement = document.getElementById('certificate-template');
    
    html2canvas(certElement, { scale: 3, useCORS: true }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Сертифікат_${courseTitle}.pdf`);
    });
  };

  if (!user || !currentLesson) return <Box sx={{ py: 10, textAlign: 'center' }}><Typography color="text.primary">Завантаження...</Typography></Box>;

  const isCurrentCompleted = completedLessonIds.includes(currentLesson.id);
  const videoId = getYouTubeVideoId(currentLesson.video_url);
  const hasQuiz = currentLesson.quiz_data && currentLesson.quiz_data.length > 0;
  const hasVideo = !!videoId;
  
  const isVideoRequirementMet = !hasVideo || isVideoWatched || isCurrentCompleted;

  const topLevelComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', pt: 4, pb: 10, position: 'relative', overflow: 'hidden' }}>
      <Container maxWidth="xl">
        
        <Paper elevation={0} sx={{ p: 2, mb: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
            <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{ textTransform: 'none', flexShrink: 0 }}>Назад до кабінету</Button>
            
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Ваш прогрес у курсі:</Typography>
                <Typography variant="body2" color="primary" sx={{ fontWeight: 700 }}>{progressPercent}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 10, borderRadius: 5 }} />
            </Box>

            {progressPercent === 100 && (
              <Button 
                variant="contained" 
                color="warning" 
                startIcon={<EmojiEventsIcon />}
                onClick={generateCertificate}
                sx={{ fontWeight: 800, px: 3, py: 1, borderRadius: '8px', boxShadow: '0 4px 14px 0 rgba(230, 81, 0, 0.39)', flexShrink: 0 }}
              >
                Отримати Сертифікат
              </Button>
            )}
          </Box>
        </Paper>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr', lg: '3fr 1fr' }, gap: 4, alignItems: 'start' }}>
          
          <Box sx={{ minWidth: 0 }}> 
            
            <Paper elevation={0} sx={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', mb: 4, backgroundColor: 'background.paper' }}>
              
              {hasVideo && (
                <>
                  <Box key={currentLesson.id} sx={{ width: '100%', aspectRatio: '16/9', maxHeight: { xs: '300px', sm: '450px', md: '550px' }, backgroundColor: '#000', position: 'relative', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    
                    {/* Контейнер плеєра */}
                    <div ref={videoContainerRef} style={{ width: '100%', height: '100%', maxWidth: '1200px' }} />

                    {/* РОЗУМНИЙ ЩИТ 1: Закриває верхню частину (назву відео та кнопки "Поділитися"). Клік по ним перекидає в додаток YouTube */}
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70px', zIndex: 50, backgroundColor: 'transparent' }} />

                    {/* РОЗУМНИЙ ЩИТ 2: Закриває правий нижній кут (логотип YouTube). Клік по ньому теж перекидає в додаток */}
                    <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: '100px', height: '55px', zIndex: 50, backgroundColor: 'transparent' }} />

                  </Box>
                  
                  {cheatWarning && !isCurrentCompleted && (
                    <Alert 
                      severity="error" 
                      onClose={() => setCheatWarning(false)}
                      sx={{ mt: 2, mx: 4, fontWeight: 700, borderRadius: '8px' }}
                    >
                      Навчання призупинено! Ви перемкнулися на іншу вкладку або спробували перемотати відео вперед.
                    </Alert>
                  )}

                  {!isVideoWatched && !isCurrentCompleted && (
                    <Box sx={{ px: 4, py: 1.5, backgroundColor: 'rgba(237, 108, 2, 0.1)', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main', mb: 0.5, display: 'block' }}>
                        Перегляньте відео до кінця, щоб розблокувати завдання: {Math.round(videoProgress * 100) || 0}% / 90%
                      </Typography>
                      <LinearProgress variant="determinate" value={Math.min(videoProgress * 100, 100)} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                    </Box>
                  )}
                </>
              )}

              <Box sx={{ p: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{currentLesson.title}</Typography>
                  
                  {!hasQuiz && (
                    <Button 
                      variant={isCurrentCompleted ? "outlined" : "contained"} 
                      color={isCurrentCompleted ? "success" : "primary"} 
                      size="large"
                      startIcon={isCurrentCompleted && <CheckCircleIcon />} 
                      onClick={completeLessonCore} 
                      disabled={isCurrentCompleted || !isVideoRequirementMet}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                    >
                      {isCurrentCompleted ? "Урок пройдено" : (!isVideoRequirementMet ? "Додивіться відео" : "Позначити як пройдений")}
                    </Button>
                  )}
                </Box>
                
                {currentLesson.content && (
                  <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary', whiteSpace: 'pre-wrap', fontSize: '1.05rem', mb: 5 }}>
                    {currentLesson.content}
                  </Typography>
                )}

                {hasQuiz && (
                  <Box sx={{ backgroundColor: 'background.default', p: 4, borderRadius: '12px', border: '1px solid', borderColor: 'divider', mb: 5, opacity: isVideoRequirementMet ? 1 : 0.5, pointerEvents: isVideoRequirementMet ? 'auto' : 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <QuizIcon sx={{ color: '#9c27b0', mr: 1.5, fontSize: 30 }} />
                      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>Перевірка знань</Typography>
                    </Box>

                    {!isVideoRequirementMet && (
                      <Alert severity="warning" sx={{ mb: 3, fontWeight: 600 }}>Спочатку перегляньте відеоматеріал (мінімум 90%), щоб отримати доступ до тесту.</Alert>
                    )}

                    {isCurrentCompleted ? (
                      <Alert severity="success" sx={{ mb: 2, fontWeight: 600 }}>Ви успішно склали тест! Урок зараховано.</Alert>
                    ) : (
                      <>
                        <Typography color="text.secondary" sx={{ mb: 4 }}>Для успішного завершення уроку необхідно набрати мінімум 80% правильних відповідей.</Typography>
                        {quizResult && !quizResult.passed && <Alert severity="error" sx={{ mb: 4, fontWeight: 600 }}>Ваш результат: {quizResult.score}%. Спробуйте ще раз, щоб досягти 80%.</Alert>}

                        {currentLesson.quiz_data.map((q, qIndex) => {
                          const isMultipleChoice = q.isMultiple || (q.correctIndexes && q.correctIndexes.length > 1);
                          const userSelections = quizAnswers[qIndex] || [];

                          return (
                            <FormControl component="fieldset" key={qIndex} sx={{ mb: 4, width: '100%' }}>
                              <FormLabel component="legend" sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, fontSize: '1.1rem' }}>
                                {qIndex + 1}. {q.question}
                                {isMultipleChoice && <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>(оберіть кілька варіантів)</Typography>}
                              </FormLabel>
                              
                              <FormGroup>
                                {q.options.map((opt, optIndex) => (
                                  <FormControlLabel 
                                    key={optIndex} 
                                    control={
                                      isMultipleChoice ? (
                                        <Checkbox 
                                          checked={userSelections.includes(optIndex)}
                                          onChange={() => handleOptionToggle(qIndex, optIndex, true)}
                                        />
                                      ) : (
                                        <Radio 
                                          checked={userSelections.includes(optIndex)}
                                          onChange={() => handleOptionToggle(qIndex, optIndex, false)}
                                        />
                                      )
                                    } 
                                    label={<Typography color="text.primary">{opt}</Typography>} 
                                    sx={{ mb: 0.5 }} 
                                  />
                                ))}
                              </FormGroup>
                            </FormControl>
                          );
                        })}
                        <Button variant="contained" color="secondary" size="large" onClick={handleSubmitQuiz} sx={{ fontWeight: 700, px: 5, py: 1.5, borderRadius: '8px' }}>Перевірити тест</Button>
                      </>
                    )}
                  </Box>
                )}

                <Divider sx={{ mb: 3 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Button startIcon={<ArrowBackIcon />} disabled={!hasPrev} onClick={goPrev} sx={{ textTransform: 'none', fontWeight: 600 }}>Попередній урок</Button>
                  <Button endIcon={<ArrowForwardIcon />} disabled={!hasNext} onClick={goNext} sx={{ textTransform: 'none', fontWeight: 600 }}>Наступний урок</Button>
                </Box>
              </Box>
            </Paper>

            <Paper elevation={0} sx={{ p: { xs: 2, md: 4 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }} id="comments-section">
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>Питання та обговорення</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Avatar sx={{ bgcolor: user.role === 'teacher' || user.role === 'admin' ? 'warning.main' : 'primary.main' }}>{user.full_name.charAt(0)}</Avatar>
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {replyingTo && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
                      <ReplyIcon fontSize="small" sx={{ color: 'primary.main', mr: 1 }} />
                      <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>Відповідь для {replyingTo.full_name}</Typography>
                      <IconButton size="small" onClick={() => setReplyingTo(null)} sx={{ ml: 1 }}><CloseIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  <TextField fullWidth multiline rows={2} placeholder={replyingTo ? "Напишіть вашу відповідь..." : "Задайте питання викладачу або поділіться думками..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" endIcon={<SendIcon />} onClick={handleSendComment} disabled={!newComment.trim()} sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}>{replyingTo ? "Відповісти" : "Надіслати"}</Button>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 4 }} />

              {topLevelComments.length > 0 ? (
                <List disablePadding>
                  {topLevelComments.map(comment => {
                    const isTeacher = comment.role === 'teacher' || comment.role === 'admin';
                    const replies = getReplies(comment.id);
                    return (
                      <Box key={comment.id} sx={{ mb: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Avatar sx={{ bgcolor: isTeacher ? 'warning.main' : 'text.secondary', width: 40, height: 40 }}>{comment.full_name.charAt(0)}</Avatar>
                          <Box sx={{ backgroundColor: isTeacher ? 'rgba(237, 108, 2, 0.1)' : 'action.hover', p: 2, borderRadius: '12px', flexGrow: 1, border: '1px solid', borderColor: isTeacher ? 'warning.main' : 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>{comment.full_name}</Typography>
                                {isTeacher && <Chip icon={<WorkspacePremiumIcon />} label="Викладач" size="small" color="warning" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }} />}
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(comment.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', mb: 1 }}>{comment.comment_text}</Typography>
                            <Button size="small" startIcon={<ReplyIcon />} onClick={() => { setReplyingTo(comment); document.getElementById('comments-section').scrollIntoView({ behavior: 'smooth' }); }} sx={{ textTransform: 'none', color: 'text.secondary', p: 0, minWidth: 'auto', '&:hover': { background: 'transparent', color: 'primary.main' } }}>Відповісти</Button>
                          </Box>
                        </Box>
                        {replies.length > 0 && (
                          <Box sx={{ ml: { xs: 4, md: 7 }, mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {replies.map(reply => {
                              const isReplyTeacher = reply.role === 'teacher' || reply.role === 'admin';
                              return (
                                <Box key={reply.id} sx={{ display: 'flex', gap: 2 }}>
                                  <Avatar sx={{ bgcolor: isReplyTeacher ? 'warning.main' : 'text.secondary', width: 32, height: 32, fontSize: '0.9rem' }}>{reply.full_name.charAt(0)}</Avatar>
                                  <Box sx={{ backgroundColor: isReplyTeacher ? 'rgba(237, 108, 2, 0.1)' : 'action.hover', p: 1.5, borderRadius: '12px', flexGrow: 1, border: '1px solid', borderColor: isReplyTeacher ? 'warning.main' : 'divider' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 0.5, color: 'text.primary' }}>{reply.full_name}</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.primary', whiteSpace: 'pre-wrap' }}>{reply.comment_text}</Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </List>
              ) : ( <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3, fontStyle: 'italic' }}>Поки що немає коментарів. Будьте першим!</Typography> )}
            </Paper>
          </Box>

          <Box sx={{ position: 'sticky', top: 24, minWidth: 0 }}> 
            <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', backgroundColor: 'background.paper' }}>
              <Box sx={{ p: 2, backgroundColor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', borderRadius: '12px 12px 0 0' }}><Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Зміст курсу</Typography></Box>
              <List sx={{ overflowY: 'auto', p: 0 }}>
                {lessons.map((lesson, index) => {
                  const isActive = currentLesson.id === lesson.id;
                  const isCompleted = completedLessonIds.includes(lesson.id);
                  return (
                    <React.Fragment key={lesson.id}>
                      <ListItem disablePadding>
                        <ListItemButton selected={isActive} onClick={() => { setCurrentLesson(lesson); window.scrollTo({ top: 0, behavior: 'smooth' }); }} sx={{ py: 2, px: 3, backgroundColor: isActive ? 'action.selected' : 'transparent', '&.Mui-selected': { backgroundColor: 'action.selected' }, '&:hover': { backgroundColor: 'action.hover' } }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>{isCompleted ? <CheckCircleIcon color="success" /> : <RadioButtonUncheckedIcon sx={{ color: isActive ? 'primary.main' : 'text.disabled' }} />}</ListItemIcon>
                          <ListItemText primary={lesson.title} secondary={isCompleted ? "Виконано" : `Урок ${index + 1}`} primaryTypographyProps={{ fontWeight: isActive ? 700 : 500, color: isActive ? 'primary.main' : 'text.primary' }} />
                        </ListItemButton>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Box>
        </Box>

        <Box 
          id="certificate-template" 
          sx={{ 
            position: 'absolute', left: '-9999px', top: '-9999px',
            width: '1122px', height: '793px',
            backgroundColor: '#fff',
            backgroundImage: 'radial-gradient(#f0f4f8 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            border: '20px solid #1976d2',
            padding: '60px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            textAlign: 'center', color: '#333', fontFamily: 'Arial, sans-serif'
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 100, color: '#ffb300', mb: 2 }} />
          <Typography variant="h2" sx={{ fontWeight: 900, color: '#1976d2', textTransform: 'uppercase', letterSpacing: 3, mb: 1 }}>
            Сертифікат
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 400, color: '#666', mb: 5, letterSpacing: 1 }}>
            ПРО УСПІШНЕ ЗАВЕРШЕННЯ КУРСУ
          </Typography>

          <Typography variant="h6" sx={{ color: '#555', mb: 2 }}>Цей сертифікат підтверджує, що</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#333', mb: 2, borderBottom: '2px solid #1976d2', paddingBottom: '10px', minWidth: '500px' }}>
            {user.full_name}
          </Typography>
          
          <Typography variant="h6" sx={{ color: '#555', mt: 3, mb: 2 }}>успішно пройшов(ла) та засвоїв(ла) програму курсу:</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 6 }}>
            "{courseTitle || 'Назва курсу'}"
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '80%', mt: 'auto', pt: 4, borderTop: '1px solid #ccc' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{new Date().toLocaleDateString('uk-UA')}</Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>Дата видачі</Typography>
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1976d2' }}>EasyLearn Platform</Typography>
              <Typography variant="caption" sx={{ color: '#666' }}>Освітня ліцензія</Typography>
            </Box>
          </Box>
        </Box>

        <Dialog 
          open={finishDialogOpen} 
          onClose={() => setFinishDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth 
          PaperProps={{ sx: { borderRadius: '16px', backgroundColor: 'background.paper' } }}
        >
          <DialogTitle sx={{ textAlign: 'center', fontWeight: 800, pt: 4, fontSize: '1.8rem', color: 'text.primary' }}>
            Вітаємо! Ви пройшли курс! 🎉
          </DialogTitle>
          <DialogContent sx={{ textAlign: 'center', pb: 4, px: { xs: 2, sm: 4 } }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Ваша думка дуже важлива для нас та інших студентів. Оцініть, будь ласка, цей курс:
            </Typography>
            
            <Box sx={{ textAlign: 'left', backgroundColor: 'background.default', borderRadius: '12px', mb: 3 }}>
              <ReviewsSection courseId={courseId} userId={user.id} />
            </Box>
            
            <Button 
              variant="outlined" 
              color="primary"
              size="large"
              onClick={() => navigate('/dashboard')} 
              sx={{ fontWeight: 700, borderRadius: '8px', mt: 2 }} 
              fullWidth
            >
              Повернутися до моїх курсів
            </Button>
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
}