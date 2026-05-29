import React, { useState, useEffect, useMemo } from 'react';
import { 
  Container, Typography, Box, Paper, Tabs, Tab, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, 
  Button, IconButton, Alert, Grid, Card, CardContent, TextField, 
  InputAdornment, TableSortLabel, Chip, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  const [message, setMessage] = useState('');
  
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalRevenue: 0 });
  const [finances, setFinances] = useState([]);

  const [payoutDialog, setPayoutDialog] = useState({ open: false, teacherId: null, name: '', amount: 0, card: '' });

  const [userSearch, setUserSearch] = useState('');
  const [userOrder, setUserOrder] = useState('asc');
  const [userOrderBy, setUserOrderBy] = useState('id');

  const [courseSearch, setCourseSearch] = useState('');
  const [courseOrder, setCourseOrder] = useState('asc');
  const [courseOrderBy, setCourseOrderBy] = useState('id');

  const admin = useMemo(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  }, []);

  useEffect(() => {
    if (!admin || admin.role !== 'admin') {
      navigate('/');
    } else {
      fetchData();
    }
  }, [admin, navigate]);

  const fetchData = () => {
    fetch(`http://localhost:3000/api/admin/users/${admin.id}`)
      .then(res => res.json()).then(data => Array.isArray(data) && setUsers(data));
      
    fetch(`http://localhost:3000/api/admin/courses/${admin.id}`)
      .then(res => res.json()).then(data => Array.isArray(data) && setCourses(data));

    fetch(`http://localhost:3000/api/admin/stats/${admin.id}`)
      .then(res => res.json()).then(data => setStats(data));

    fetch(`http://localhost:3000/api/admin/finances/${admin.id}`)
      .then(res => res.json()).then(data => Array.isArray(data) && setFinances(data));
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    const res = await fetch('http://localhost:3000/api/admin/users/role', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: admin.id, targetUserId, newRole })
    });
    if ((await res.json()).success) { showMessage(`Роль змінено на ${newRole}`); fetchData(); }
  };

  const handleDeleteUser = async (targetUserId) => {
    if (!window.confirm("Видалити користувача з усіма його даними?")) return;
    const res = await fetch(`http://localhost:3000/api/admin/users/${admin.id}/${targetUserId}`, { method: 'DELETE' });
    if ((await res.json()).success) { showMessage("Користувача видалено"); fetchData(); }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Ви впевнені, що хочете остаточно видалити цей курс?")) return;
    const res = await fetch(`http://localhost:3000/api/admin/courses/${admin.id}/${courseId}`, { method: 'DELETE' });
    if ((await res.json()).success) { showMessage("Курс видалено"); fetchData(); }
  };

  const handleCourseStatus = async (courseId, status) => {
    const res = await fetch(`http://localhost:3000/api/admin/courses/${admin.id}/${courseId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if ((await res.json()).success) { 
      showMessage(status === 'published' ? 'Курс опубліковано на сайті!' : `Статус змінено на ${status}`); 
      fetchData(); 
    }
  };

  const confirmPayout = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/admin/payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: admin.id, teacherId: payoutDialog.teacherId })
      });
      const data = await res.json();
      if (data.success) {
        showMessage("Виплату успішно зафіксовано в системі!");
        setPayoutDialog({ open: false, teacherId: null, name: '', amount: 0, card: '' });
        fetchData(); 
      }
    } catch (error) {
      console.error("Помилка фіксації виплати:", error);
    }
  };

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3000);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const handleUserSort = (property) => {
    const isAsc = userOrderBy === property && userOrder === 'asc';
    setUserOrder(isAsc ? 'desc' : 'asc');
    setUserOrderBy(property);
  };

  const handleCourseSort = (property) => {
    const isAsc = courseOrderBy === property && courseOrder === 'asc';
    setCourseOrder(isAsc ? 'desc' : 'asc');
    setCourseOrderBy(property);
  };

  const filteredAndSortedUsers = users
    .filter(u => u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    .sort(getComparator(userOrder, userOrderBy));

  const filteredAndSortedCourses = courses
    .filter(c => c.title.toLowerCase().includes(courseSearch.toLowerCase()) || (c.teacher_name && c.teacher_name.toLowerCase().includes(courseSearch.toLowerCase())))
    .sort(getComparator(courseOrder, courseOrderBy));

  if (!admin || admin.role !== 'admin') return null;

  return (
    <Box sx={{ backgroundColor: 'background.default', minHeight: '100vh', py: 5 }}>
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
          <SupervisorAccountIcon sx={{ fontSize: 40, color: '#d32f2f' }} />
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>Control Room (Адмін)</Typography>
        </Box>

        {message && <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>}

        <Paper sx={{ width: '100%', mb: 4, borderRadius: '12px', overflow: 'hidden' }} elevation={2}>
          <Tabs 
            value={tabIndex} onChange={(e, newValue) => setTabIndex(newValue)} 
            indicatorColor="primary" textColor="primary" variant="scrollable" scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}
          >
            <Tab label="Аналітика та Фінанси" sx={{ fontWeight: 700 }} />
            <Tab label="Управління Користувачами" sx={{ fontWeight: 700 }} />
            <Tab label="Модерація Курсів" sx={{ fontWeight: 700 }} />
            <Tab label="Виплати Викладачам" sx={{ fontWeight: 700 }} />
          </Tabs>

          {tabIndex === 0 && (
            <Box sx={{ p: 4, backgroundColor: 'background.paper' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: 'text.primary' }}>Ключові показники платформи (KPI)</Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: '16px', borderLeft: '6px solid #4caf50', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Загальний дохід (Гросс)</Typography>
                        <AttachMoneyIcon sx={{ color: '#4caf50', fontSize: 30 }} />
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{stats.totalRevenue} ₴</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: '16px', borderLeft: '6px solid #1976d2', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Користувачів</Typography>
                        <PeopleAltIcon sx={{ color: '#1976d2', fontSize: 30 }} />
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{stats.totalUsers}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: '16px', borderLeft: '6px solid #ff9800', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Опубліковано курсів</Typography>
                        <MenuBookIcon sx={{ color: '#ff9800', fontSize: 30 }} />
                      </Box>
                      <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary' }}>{stats.totalCourses}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box sx={{ p: 3, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Управління користувачами</Typography>
                <TextField 
                  size="small" placeholder="Пошук за ім'ям або email..." variant="outlined" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                  sx={{ width: '300px', backgroundColor: 'background.default', borderRadius: '8px' }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table>
                  <TableHead sx={{ backgroundColor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={userOrderBy === 'id'} direction={userOrderBy === 'id' ? userOrder : 'asc'} onClick={() => handleUserSort('id')}>ID</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Ім'я</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={userOrderBy === 'role'} direction={userOrderBy === 'role' ? userOrder : 'asc'} onClick={() => handleUserSort('role')}>Роль</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary', align: 'right' }}>Дії</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedUsers.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell sx={{ color: 'text.primary' }}>{u.id}</TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{u.full_name}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{u.email}</TableCell>
                        <TableCell>
                          <Select value={u.role} size="small" onChange={(e) => handleRoleChange(u.id, e.target.value)} disabled={u.id === admin.id} sx={{ minWidth: 120, height: 32 }}>
                            <MenuItem value="student">Студент</MenuItem>
                            <MenuItem value="teacher">Викладач</MenuItem>
                            <MenuItem value="admin" sx={{ color: 'error.main' }}>Адмін</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton color="error" onClick={() => handleDeleteUser(u.id)} disabled={u.id === admin.id}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabIndex === 2 && (
            <Box sx={{ p: 3, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Модерація контенту</Typography>
                <TextField 
                  size="small" placeholder="Пошук за назвою або автором..." variant="outlined" value={courseSearch} onChange={(e) => setCourseSearch(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment> }}
                  sx={{ width: '300px', backgroundColor: 'background.default', borderRadius: '8px' }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table>
                  <TableHead sx={{ backgroundColor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={courseOrderBy === 'id'} direction={courseOrderBy === 'id' ? courseOrder : 'asc'} onClick={() => handleCourseSort('id')}>ID</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Статус</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={courseOrderBy === 'title'} direction={courseOrderBy === 'title' ? courseOrder : 'asc'} onClick={() => handleCourseSort('title')}>Назва курсу</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={courseOrderBy === 'teacher_name'} direction={courseOrderBy === 'teacher_name' ? courseOrder : 'asc'} onClick={() => handleCourseSort('teacher_name')}>Автор</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}><TableSortLabel active={courseOrderBy === 'price'} direction={courseOrderBy === 'price' ? courseOrder : 'asc'} onClick={() => handleCourseSort('price')}>Ціна</TableSortLabel></TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary', align: 'right' }}>Дії / Премодерація</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredAndSortedCourses.map((c) => (
                      <TableRow key={c.id} hover sx={{ backgroundColor: c.status === 'pending' ? 'action.hover' : 'inherit' }}>
                        <TableCell sx={{ color: 'text.primary' }}>{c.id}</TableCell>
                        <TableCell>
                          <Select 
                            value={c.status} 
                            size="small" 
                            onChange={(e) => handleCourseStatus(c.id, e.target.value)}
                            sx={{ 
                              minWidth: 140, height: 32, fontWeight: 600,
                              backgroundColor: c.status === 'published' ? 'rgba(46, 125, 50, 0.1)' : c.status === 'rejected' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(237, 108, 2, 0.1)',
                              color: c.status === 'published' ? 'success.main' : c.status === 'rejected' ? 'error.main' : 'warning.main'
                            }}
                          >
                            <MenuItem value="pending">На перевірці</MenuItem>
                            <MenuItem value="published">Опубліковано</MenuItem>
                            <MenuItem value="rejected">Відхилено</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{c.title}</TableCell>
                        <TableCell sx={{ color: 'text.secondary' }}>{c.teacher_name}</TableCell>
                        <TableCell sx={{ color: c.price > 0 ? 'success.main' : 'text.secondary', fontWeight: 700 }}>
                          {c.price > 0 ? `${c.price} ₴` : 'Безкоштовно'}
                        </TableCell>
                        <TableCell align="right">
                          <Button variant="outlined" size="small" sx={{ ml: 1, mr: 1 }} onClick={() => navigate(`/lesson/${c.id}`)}>Переглянути</Button>
                          <IconButton color="error" title="Видалити назавжди" onClick={() => handleDeleteCourse(c.id)}><DeleteIcon /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {tabIndex === 3 && (
            <Box sx={{ p: 3, backgroundColor: 'background.paper' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>Контроль виплат викладачам</Typography>
                <Chip icon={<AccountBalanceWalletIcon />} label="Комісія платформи: 30%" color="primary" variant="outlined" />
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <Table>
                  <TableHead sx={{ backgroundColor: 'background.default' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>ID Викладача</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>ПІБ</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Реквізити (Картка)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.primary' }}>Продано курсів</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>Дохід платформи (30%)</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'success.main' }}>До виплати викладачу (70%)</TableCell>
                      <TableCell sx={{ fontWeight: 700, align: 'right', color: 'text.primary' }}>Дії</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {finances.length > 0 ? finances.map((f) => {
                      const total = Number(f.total_earned) || 0;
                      const platformFee = total * 0.3;
                      const teacherPayout = total * 0.7;

                      return (
                        <TableRow key={f.teacher_id} hover>
                          <TableCell sx={{ color: 'text.primary' }}>{f.teacher_id}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'text.primary' }}>{f.teacher_name}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                            {f.card_number ? (
                              <Chip icon={<CreditCardIcon />} label={f.card_number} size="small" variant="outlined" />
                            ) : (
                              <Typography color="error" variant="caption">Не вказано</Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ color: 'text.primary' }}>{f.sales_count}</TableCell>
                          <TableCell sx={{ color: 'error.main', fontWeight: 600 }}>{platformFee.toFixed(2)} ₴</TableCell>
                          <TableCell sx={{ color: 'success.main', fontWeight: 800 }}>{teacherPayout.toFixed(2)} ₴</TableCell>
                          <TableCell align="right">
                            <Button 
                              variant="contained" color="success" size="small" 
                              sx={{ textTransform: 'none', borderRadius: '8px' }}
                              disabled={!f.card_number}
                              onClick={() => setPayoutDialog({ 
                                open: true, teacherId: f.teacher_id, name: f.teacher_name, 
                                amount: teacherPayout.toFixed(2), card: f.card_number 
                              })}
                            >
                              Позначити як виплачено
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>Всі поточні виплати здійснено</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>

        <Dialog open={payoutDialog.open} onClose={() => setPayoutDialog({ ...payoutDialog, open: false })}>
          <DialogTitle sx={{ fontWeight: 800, color: 'text.primary' }}>Підтвердження виплати</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2, color: 'text.primary' }}>
              Ви підтверджуєте переказ гонорару для <b>{payoutDialog.name}</b>?
            </DialogContentText>
            <Paper elevation={0} sx={{ p: 2, backgroundColor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
              <Typography variant="body2" color="text.secondary">Сума до переказу викладачу (70%):</Typography>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 800, mb: 2 }}>{payoutDialog.amount} ₴</Typography>
              <Typography variant="body2" color="text.secondary">Реквізити отримувача (Картка):</Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: 2, color: 'text.primary' }}>{payoutDialog.card}</Typography>
            </Paper>
            <DialogContentText sx={{ mt: 2, fontSize: '0.82rem', color: 'error.main' }}>
              * Примітка: Ця операція оновлює фінансову звітність у базі даних та списує доступний до виплати баланс. Переказ грошей на банківську картку здійснюється вручну за вказаними реквізитами.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setPayoutDialog({ ...payoutDialog, open: false })} color="inherit">Скасувати</Button>
            <Button onClick={confirmPayout} variant="contained" color="success" autoFocus>Підтвердити виплату</Button>
          </DialogActions>
        </Dialog>

      </Container>
    </Box>
  );
}