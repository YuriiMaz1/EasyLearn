import React, { useState, useEffect } from 'react';
import { Box, Typography, Rating, TextField, Button, Paper, Avatar, Divider, Alert } from '@mui/material';

export default function ReviewsSection({ courseId, userId }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');

  const fetchReviews = () => {
    fetch(`http://localhost:3000/api/reviews/${courseId}`)
      .then(res => res.json())
      .then(data => setReviews(data));
  };

  useEffect(() => { fetchReviews(); }, [courseId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) { setMessage('Будь ласка, увійдіть, щоб залишити відгук'); return; }

    const response = await fetch('http://localhost:3000/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ course_id: courseId, user_id: userId, rating, comment })
    });

    if (response.ok) {
      setComment('');
      setRating(5);
      setMessage('Дякуємо за ваш відгук!');
      fetchReviews();
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1) 
    : 0;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Відгуки студентів</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
        <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main' }}>{averageRating}</Typography>
        <Box>
          <Rating value={Number(averageRating)} precision={0.5} readOnly />
          <Typography variant="body2" color="textSecondary">{reviews.length} відгуків</Typography>
        </Box>
      </Box>

      {/* Форма відгуку */}
      <Paper sx={{ p: 3, mb: 5, borderRadius: '12px', border: '1px solid #eee' }} elevation={0}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Залишити свій відгук</Typography>
        {message && <Alert severity="info" sx={{ mb: 2 }}>{message}</Alert>}
        <form onSubmit={handleSubmit}>
          <Rating value={rating} onChange={(e, newValue) => setRating(newValue)} sx={{ mb: 2 }} />
          <TextField 
            fullWidth multiline rows={3} placeholder="Поділіться вашими враженнями від курсу..." 
            value={comment} onChange={(e) => setComment(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained" disabled={!userId}>Опублікувати</Button>
        </form>
      </Paper>

      {/* Список відгуків */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {reviews.map((rev) => (
          <Box key={rev.id}>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>{rev.full_name[0]}</Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700 }}>{rev.full_name}</Typography>
                <Rating value={rev.rating} size="small" readOnly />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                {new Date(rev.created_at).toLocaleDateString()}
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: '#444', ml: 7 }}>{rev.comment}</Typography>
            <Divider sx={{ mt: 2 }} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}