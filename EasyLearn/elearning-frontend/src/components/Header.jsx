import React, { useState, useEffect, useContext } from 'react';
import { 
  AppBar, Toolbar, Typography, Button, Box, InputBase, Container, Avatar, 
  Paper, List, ListItem, ListItemAvatar, ListItemText, CircularProgress, 
  IconButton, useTheme, Menu, MenuItem, Divider, Badge, Drawer, Tooltip, ListItemIcon
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import SchoolIcon from '@mui/icons-material/School';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import { Link, useNavigate } from 'react-router-dom';
import { ColorModeContext } from '../App';

const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative', 
  marginRight: theme.spacing(1), 
  marginLeft: theme.spacing(1), 
  width: '100%', 
  [theme.breakpoints.up('sm')]: { width: 'auto' },
}));

const Search = styled('div')(({ theme }) => ({
  position: 'relative', 
  borderRadius: '20px', 
  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : theme.palette.action.hover,
  '&:hover': { 
    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : theme.palette.action.selected 
  },
  width: '100%', 
  border: `1px solid ${theme.palette.divider}`,
  transition: 'background-color 0.2s ease',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2), 
  height: '100%', 
  position: 'absolute',
  pointerEvents: 'none', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center',
}));

// Оптимизирована ширина поиска, чтобы спасти место
const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit', 
  '& .MuiInputBase-input': { 
    padding: theme.spacing(1, 1, 1, 0), 
    paddingLeft: `calc(1em + ${theme.spacing(4)})`, 
    transition: theme.transitions.create('width'), 
    width: '100%', 
    [theme.breakpoints.up('md')]: { 
      width: '12ch', 
      '&:focus': { width: '20ch' } // Расширяется при клике
    }, 
    [theme.breakpoints.up('lg')]: { 
      width: '20ch', 
      '&:focus': { width: '28ch' }
    }, 
  },
}));

export default function Header() {
  const navigate = useNavigate();
  const theme = useTheme(); 
  const colorMode = useContext(ColorModeContext); 

  const savedUser = localStorage.getItem('user');
  const user = savedUser ? JSON.parse(savedUser) : null;
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user && user.id) {
    const safeUserId = Number.parseInt(user.id, 10);
    if (!Number.isNaN(safeUserId)) {
        fetch(`http://localhost:3000/api/notifications/${safeUserId}`)
          .then(res => res.json())
          .then(data => setNotifications(Array.isArray(data) ? data : []))
          .catch(err => console.error(err));
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]); 
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(() => {
      fetch(`http://localhost:3000/api/search?q=${searchQuery}`)
        .then(res => res.json())
        .then(data => {
          setSearchResults(data);
          setIsSearching(false);
        })
        .catch(err => {
          console.error(err);
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleMobileToggle = () => setMobileOpen(!mobileOpen);

  const handleNotifOpen = (event) => {
    setNotifAnchorEl(event.currentTarget);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    if (unreadCount > 0) {
      fetch(`http://localhost:3000/api/notifications/${user.id}/read`, { method: 'PUT' })
        .then(() => {
          setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
        })
        .catch(err => console.error(err));
    }
  };
  const handleNotifClose = () => setNotifAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
    window.location.reload();
  };

  const handleResultClick = (courseId) => {
    setSearchQuery(''); 
    setSearchResults([]); 
    navigate(`/course/${courseId}`); 
  };

  const unreadNotifCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppBar position="sticky" elevation={0} sx={{ backgroundColor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', zIndex: 1100 }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: '70px', flexWrap: 'nowrap' }}>
          
          <IconButton color="inherit" edge="start" onClick={handleMobileToggle} sx={{ mr: 1, display: { md: 'none' }, flexShrink: 0 }}>
            <MenuIcon />
          </IconButton>

          <SchoolIcon sx={{ display: { xs: 'none', sm: 'flex' }, mr: 1, color: 'primary.main', flexShrink: 0 }} />
          <Typography variant="h6" component={Link} to="/" sx={{ mr: { xs: 2, md: 3 }, display: 'flex', fontFamily: '"Google Sans", "Roboto", sans-serif', fontWeight: 700, fontSize: { xs: '1.2rem', sm: '1.4rem' }, color: 'primary.main', textDecoration: 'none', flexShrink: 0 }}>
            EasyLearn
          </Typography>
          
          {/* ДЕСКТОПНЕ МЕНЮ */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: { md: 0.5, lg: 1.5 }, overflow: 'hidden' }}>
            <Button component={Link} to="/catalog" sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500, minWidth: 'auto' }}>Каталог</Button>
            
            <Tooltip title="Скласти персональний план навчання з ШІ">
              <Button 
                component={Link} 
                to="/mentor"
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                sx={{
                  background: 'linear-gradient(45deg, #7b1fa2 30%, #e91e63 90%)',
                  color: 'white',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '20px',
                  boxShadow: '0 3px 15px rgba(233, 30, 99, 0.4)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 6px 20px rgba(233, 30, 99, 0.6)',
                  }
                }}
              >
                AI Навігатор
              </Button>
            </Tooltip>

            {user && (
              <Button 
                component={Link} 
                to="/arena"
                variant="contained"
                color="secondary"
                startIcon={<SportsEsportsIcon />}
                sx={{
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: '20px',
                  boxShadow: '0 3px 10px rgba(156, 39, 176, 0.3)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
              >
                ПВП-Арена
              </Button>
            )}

            {user && <Button component={Link} to="/dashboard" sx={{ color: 'text.primary', textTransform: 'none', fontWeight: 500, whiteSpace: 'nowrap', minWidth: 'auto' }}>Мої Курси</Button>}
            
            {user && (user.role === 'teacher' || user.role === 'admin') && (
              <Button component={Link} to="/teacher" sx={{ color: 'primary.main', textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 'auto' }}>Створити курс</Button>
            )}
          </Box>

          <SearchContainer>
            <Search>
              <SearchIconWrapper>
                {isSearching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon color="action" />}
              </SearchIconWrapper>
              <StyledInputBase 
                placeholder="Шукати онлайн-курси…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Search>

            {searchQuery.trim() !== '' && (
              <Paper elevation={4} sx={{ position: 'absolute', top: '120%', left: 0, right: 0, borderRadius: '12px', overflow: 'hidden', zIndex: 1200, backgroundColor: 'background.paper', minWidth: '250px' }}>
                {searchResults.length > 0 ? (
                  <List disablePadding>
                    {searchResults.map((course) => (
                      <React.Fragment key={course.id}>
                        <ListItem button onClick={() => handleResultClick(course.id)} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                          <ListItemAvatar>
                            <Avatar variant="rounded" src={course.image_url} sx={{ width: 50, height: 50 }} />
                          </ListItemAvatar>
                          <ListItemText 
                            primary={course.title} 
                            secondary={course.category}
                            primaryTypographyProps={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}
                            secondaryTypographyProps={{ color: 'text.secondary' }}
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {isSearching ? 'Шукаємо...' : 'Нічого не знайдено'}
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </SearchContainer>

          {/* ПРАВИЙ БЛОК: НІКОЛИ НЕ СТИСКАЄТЬСЯ */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <IconButton sx={{ ml: { xs: 0, sm: 1 } }} onClick={colorMode.toggleColorMode} color="inherit">
              {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>

            {user ? (
              <>
                <IconButton color="inherit" onClick={handleNotifOpen} sx={{ ml: 0.5 }}>
                  <Badge badgeContent={unreadNotifCount} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>

                <Menu
                  anchorEl={notifAnchorEl}
                  open={Boolean(notifAnchorEl)}
                  onClose={handleNotifClose}
                  PaperProps={{
                    elevation: 4,
                    sx: { mt: 1.5, width: 320, maxHeight: 400, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>Сповіщення</Typography>
                  </Box>
                  {notifications.length > 0 ? (
                    <List disablePadding>
                      {notifications.map(n => (
                        <React.Fragment key={n.id}>
                          <ListItem 
                            button
                            onClick={() => { 
                              if(n.link) {
                                navigate(n.link);
                                handleNotifClose();
                              }
                            }}
                            sx={{ 
                              py: 1.5, 
                              backgroundColor: n.is_read ? 'transparent' : 'action.hover',
                              transition: 'background-color 0.3s',
                              cursor: n.link ? 'pointer' : 'default'
                            }}
                          >
                            <ListItemText 
                              primary={n.message} 
                              secondary={new Date(n.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              primaryTypographyProps={{ variant: 'body2', fontWeight: n.is_read ? 500 : 700, color: 'text.primary' }}
                              secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                            />
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Немає нових сповіщень</Typography>
                    </Box>
                  )}
                </Menu>

                <IconButton onClick={handleMenuOpen} sx={{ p: 0, ml: 1.5 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: '1.2rem', fontWeight: 700, border: `2px solid`, borderColor: 'divider' }}>
                    {user.full_name.charAt(0)}
                  </Avatar>
                </IconButton>
                
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  PaperProps={{
                    elevation: 4,
                    sx: { mt: 1.5, minWidth: 200, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>{user.full_name}</Typography>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                    {user.role === 'admin' && <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>Адміністратор</Typography>}
                  </Box>
                  
                  <MenuItem component={Link} to="/profile" onClick={handleMenuClose} sx={{ py: 1.5, fontWeight: 500, color: 'text.primary' }}>Особистий кабінет</MenuItem>
                  <MenuItem component={Link} to="/dashboard" onClick={handleMenuClose} sx={{ py: 1.5, fontWeight: 500, color: 'text.primary' }}>Мої курси</MenuItem>

                  {user.role === 'admin' && (
                    <MenuItem component={Link} to="/admin" onClick={handleMenuClose} sx={{ py: 1.5, fontWeight: 700, color: 'error.main' }}>
                      Панель адміністратора
                    </MenuItem>
                  )}
                  
                  <Divider sx={{ my: 1 }} />
                  
                  <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }} sx={{ py: 1.5, color: 'error.main', fontWeight: 600 }}>
                    Вийти з акаунта
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button component={Link} to="/login" variant="outlined" color="primary" sx={{ ml: 1, textTransform: 'none', borderRadius: '20px', fontWeight: 600, px: 3 }}>Увійти</Button>
            )}
          </Box>

        </Toolbar>
      </Container>

      {/* МОБІЛЬНЕ МЕНЮ (ДЛЯ ТЕЛЕФОНІВ) */}
      <Drawer anchor="left" open={mobileOpen} onClose={handleMobileToggle}>
        <Box sx={{ width: 280, p: 2, backgroundColor: 'background.paper', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>Меню</Typography>
            <IconButton onClick={handleMobileToggle}><CloseIcon /></IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <List>
            <ListItem button component={Link} to="/catalog" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1 }}>
              <ListItemText primary="Каталог" primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }} />
            </ListItem>
            
            <ListItem button component={Link} to="/mentor" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1, backgroundColor: 'rgba(233, 30, 99, 0.05)' }}>
              <ListItemIcon sx={{ minWidth: 40 }}><AutoAwesomeIcon sx={{ color: '#e91e63' }} /></ListItemIcon>
              <ListItemText primary="AI Навігатор" primaryTypographyProps={{ fontWeight: 700, color: '#e91e63' }} />
            </ListItem>

            {user && (
              <ListItem button component={Link} to="/arena" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1, backgroundColor: 'rgba(156, 39, 176, 0.05)' }}>
                <ListItemIcon sx={{ minWidth: 40 }}><SportsEsportsIcon color="secondary" /></ListItemIcon>
                <ListItemText primary="ПВП-Арена" primaryTypographyProps={{ fontWeight: 700, color: 'secondary.main' }} />
              </ListItem>
            )}

            {user && (
              <ListItem button component={Link} to="/dashboard" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1 }}>
                <ListItemText primary="Мої Курси" primaryTypographyProps={{ fontWeight: 600, color: 'text.primary' }} />
              </ListItem>
            )}

            {user && (user.role === 'teacher' || user.role === 'admin') && (
              <ListItem button component={Link} to="/teacher" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1 }}>
                <ListItemText primary="Створити курс" primaryTypographyProps={{ fontWeight: 600, color: 'primary.main' }} />
              </ListItem>
            )}

            {user && user.role === 'admin' && (
              <ListItem button component={Link} to="/admin" onClick={handleMobileToggle} sx={{ borderRadius: '8px', mb: 1 }}>
                <ListItemText primary="Адмін-панель" primaryTypographyProps={{ fontWeight: 700, color: 'error.main' }} />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}