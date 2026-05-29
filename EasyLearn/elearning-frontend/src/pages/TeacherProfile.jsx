import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Avatar, Grid, Card, CardContent, Chip, Divider, Button } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import StarIcon from '@mui/icons-material/Star';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SchoolIcon from '@mui/icons-material/School';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

export default function TeacherProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3000/api/teacher-profile/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Викладача не знайдено');
        return res.json();
      })
      .then(data => {
        if (data.success) {
          setTeacher(data.teacher);
          setCourses(data.courses);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <Typography sx={{ p: 5, textAlign: 'center', color: 'text.secondary' }}>Завантаження профілю...</Typography>;
  if (!teacher) return <Typography sx={{ p: 5, textAlign: 'center', color: 'error.main' }}>Викладача не знайдено.</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 10 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: '16px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', mb: 6 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar sx={{ width: 150, height: 150, bgcolor: 'primary.main', fontSize: '4rem', fontWeight: 800 }}>
              {teacher.full_name.charAt(0)}
            </Avatar>
          </Grid>
          <Grid item xs={12} md={9}>
            <Chip label="Викладач платформи" color="secondary" size="small" sx={{ mb: 2, fontWeight: 600 }} />
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 2 }}>
              {teacher.full_name}
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, mb: 3 }}>
              {teacher.bio || "Цей викладач ще не додав інформацію про себе."}
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SchoolIcon color="primary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>{courses.length} курсів</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 3 }}>
        Курси від {teacher.full_name}
      </Typography>
      
      {courses.length > 0 ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {courses.map(course => (
            <Card key={course.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', boxShadow: 'none', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' } }}>
              <Box sx={{ width: '100%', height: 160, backgroundImage: `url(${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'divider' }} />
              <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                  <Chip label={course.category} size="small" sx={{ backgroundColor: 'action.hover', fontWeight: 600, color: 'text.secondary' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <StarIcon sx={{ color: 'warning.main', fontSize: 18, mr: 0.5 }} />
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {Number(course.average_rating || 0).toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
                <Typography gutterBottom variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 2, minHeight: '2.4em', color: 'text.primary' }}>
                  {course.title}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  <Chip icon={<AccessTimeIcon fontSize="small" />} label={course.duration} size="small" sx={{ backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 500 }} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <LocalOfferIcon fontSize="small" sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'success.main' }}>
                    {Number(course.price) === 0 ? 'Безкоштовно' : `${course.price} грн`}
                  </Typography>
                </Box>
                <Button variant="contained" fullWidth sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }} onClick={() => navigate(`/course/${course.id}`)}>
                  До курсу
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary">У цього викладача ще немає активних курсів.</Typography>
      )}
    </Container>
  );
}