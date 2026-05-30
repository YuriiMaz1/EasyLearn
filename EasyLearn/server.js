require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { YoutubeTranscript } = require('youtube-transcript');
const app = express();
app.use(cors());
app.use(express.json());


// НАЛАШТУВАННЯ ЗАВАНТАЖЕННЯ ФАЙЛІВ
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.get('/api/admin/fill-transcripts', async (req, res) => {
    const sqlSelect = "SELECT id, title, video_url FROM lessons WHERE transcript_text IS NULL";
    
    db.query(sqlSelect, async (err, lessons) => {
        if (err) return res.status(500).json({ error: err.message });
        if (lessons.length === 0) return res.json({ success: true, message: "Все уроки уже имеют субтитры!" });

        let updatedCount = 0;

        for (const lesson of lessons) {
            if (lesson.video_url) {
                try {
                    const transcript = await YoutubeTranscript.fetchTranscript(lesson.video_url);
                    const text = transcript.map(t => t.text).join(' ');
                    
                    await db.promise().query("UPDATE lessons SET transcript_text = ? WHERE id = ?", [text, lesson.id]);
                    updatedCount++;
                    console.log(`[MIGRATION] Загружены субтитры для: ${lesson.title}`);
                } catch (error) {
                    console.error(`[MIGRATION] Ошибка для "${lesson.title}":`, error.message);
                }
            }
        }

        res.json({ success: true, message: `Обработано уроков: ${updatedCount}` });
    });
});
app.use('/uploads', express.static(uploadDir));
const crypto = require('crypto');
const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });

app.use(helmet({
    crossOriginResourcePolicy: false, 
    contentSecurityPolicy: false, 
}));
// 1. ПОДКЛЮЧЕНИЕ К БАЗЕ ДАННЫХ

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Помилка підключення БД:', err.message);
    } else {
        console.log('Успішне підключення до бази даних MySQL!');
        connection.release();
    }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });


// 2. АВТОРИЗАЦИЯ И ПОЛЬЗОВАТЕЛИ


app.get('/api/users', (req, res) => {
    const sql = "SELECT id, full_name, email, role, card_number, bio FROM users";
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: "Ошибка при получении данных" });
        res.json(results);
    });
});

app.get('/api/teacher-profile/:id', (req, res) => {
    const teacherId = req.params.id;
    const sqlUser = "SELECT id, full_name, bio FROM users WHERE id = ? AND (role = 'teacher' OR role = 'admin')";
    
    db.query(sqlUser, [teacherId], (err, userResults) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (userResults.length === 0) return res.status(404).json({ success: false, error: "Викладача не знайдено" });

        const sqlCourses = `
            SELECT c.*, IFNULL(AVG(r.rating), 0) as average_rating, COUNT(r.id) as review_count
            FROM courses c
            LEFT JOIN reviews r ON c.id = r.course_id
            WHERE c.teacher_id = ? AND c.status = 'published'
            GROUP BY c.id
        `;
        
        db.query(sqlCourses, [teacherId], (err, courseResults) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, teacher: userResults[0], courses: courseResults });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const sql = "SELECT id, full_name, email, role FROM users WHERE email = ? AND password_hash = ?";
    
    const hashedPassword = hashPassword(password);
    
    db.query(sql, [email, hashedPassword], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        
        if (results.length > 0) {
            res.json({ success: true, user: results[0] });
        } else {
            res.status(401).json({ success: false, message: "Невірний email або пароль" });
        }
    });
});

app.post('/api/register', (req, res) => {
    const { full_name, email, password, role = 'student' } = req.body;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, error: "Дозволені лише @gmail.com!" });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ success: false, error: "Пароль надто короткий!" });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Помилка сервера" });
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, error: "Користувач з таким email вже існує!" });
        }

        const sql = 'INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)';
        
        const hashedPassword = hashPassword(password);
        
        db.query(sql, [full_name, email, hashedPassword, role], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: "Помилка при створенні акаунта" });
            res.json({ success: true, message: "Реєстрація успішна!", user: { id: result.insertId, full_name, email, role } });
        });
    });
});

app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { full_name, email, oldPassword, newPassword, card_number, bio } = req.body;

    if (newPassword && newPassword.trim() !== '') {
        db.query('SELECT password_hash FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) return res.status(500).json({ success: false, error: "Помилка сервера" });
            if (results.length === 0) return res.status(404).json({ success: false, error: "Користувача не знайдено" });

            const userRecord = results[0];

            if (userRecord.password_hash !== oldPassword) {
                return res.status(400).json({ success: false, error: "Невірний поточний пароль!" });
            }

            const sql = 'UPDATE users SET full_name = ?, email = ?, password_hash = ?, card_number = ?, bio = ? WHERE id = ?';
            db.query(sql, [full_name, email, newPassword, card_number || null, bio || null, userId], (err) => {
                if (err) return res.status(500).json({ success: false, error: "Помилка сервера" });
                res.json({ success: true, message: "Профіль та пароль успішно оновлено!" });
            });
        });
    } else {
        const sql = 'UPDATE users SET full_name = ?, email = ?, card_number = ?, bio = ? WHERE id = ?';
        db.query(sql, [full_name, email, card_number || null, bio || null, userId], (err) => {
            if (err) return res.status(500).json({ success: false, error: "Помилка сервера" });
            res.json({ success: true, message: "Дані профілю оновлено!" });
        });
    }
});


// 2.5 СИСТЕМА ПОВІДОМЛЕНЬ ТА ІЗБРАННЕ


app.get('/api/notifications/:userId', (req, res) => {
    const sql = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20";
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/notifications/:userId/read', (req, res) => {
    const sql = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
    db.query(sql, [req.params.userId], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

app.get('/api/wishlist/:userId', (req, res) => {
    const sql = `
        SELECT c.*, u.full_name as teacher_name, 
        IFNULL(AVG(r.rating), 0) as average_rating, COUNT(r.id) as review_count
        FROM wishlist w
        JOIN courses c ON w.course_id = c.id
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN reviews r ON c.id = r.course_id
        WHERE w.user_id = ? AND c.status = 'published'
        GROUP BY c.id
    `;
    db.query(sql, [req.params.userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/wishlist/toggle', (req, res) => {
    const { user_id, course_id } = req.body;
    db.query('SELECT id FROM wishlist WHERE user_id = ? AND course_id = ?', [user_id, course_id], (err, results) => {
        if (err) return res.status(500).json({ success: false });
        if (results.length > 0) {
            db.query('DELETE FROM wishlist WHERE id = ?', [results[0].id], () => res.json({ success: true, isFavorite: false }));
        } else {
            db.query('INSERT INTO wishlist (user_id, course_id) VALUES (?, ?)', [user_id, course_id], () => res.json({ success: true, isFavorite: true }));
        }
    });
});


// 3. КАТАЛОГ И ПОИСК КУРСОВ

app.get('/api/courses', (req, res) => {
    const sql = `
        SELECT c.*, u.full_name as teacher_name, 
        IFNULL(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN reviews r ON c.id = r.course_id
        WHERE c.status = 'published'
        GROUP BY c.id`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/courses/top', (req, res) => {
    const sql = `
        SELECT c.*, u.full_name as teacher_name, 
        IFNULL(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        LEFT JOIN reviews r ON c.id = r.course_id
        WHERE c.status = 'published'
        GROUP BY c.id
        HAVING average_rating >= 4.5
        ORDER BY average_rating DESC, review_count DESC
        LIMIT 3`;

    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/search', (req, res) => {
    const q = req.query.q; 
    if (!q) return res.json([]); 

    const searchPattern = `%${q}%`; 
    const sql = `
        SELECT id, title, image_url, category, price 
        FROM courses 
        WHERE (title LIKE ? OR description LIKE ? OR category LIKE ?) AND status = 'published'
        LIMIT 5
    `;

    db.query(sql, [searchPattern, searchPattern, searchPattern], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        res.json(results);
    });
});

app.get('/api/courses/:id', (req, res) => {
    const courseId = req.params.id;
    const sql = `
        SELECT courses.*, users.full_name AS teacher_name 
        FROM courses 
        LEFT JOIN users ON courses.teacher_id = users.id
        WHERE courses.id = ?
    `;
    
    db.query(sql, [courseId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        if (results.length === 0) return res.status(404).json({ error: "Курс не знайдено" });
        res.json(results[0]);
    });
});

app.get('/api/analytics/:courseId/funnel', (req, res) => {
    const courseId = req.params.courseId;
    const sql = `
        SELECT 
            l.id, 
            l.title, 
            l.order_number,
            COUNT(cl.student_id) AS completed_count
        FROM lessons l
        LEFT JOIN completed_lessons cl ON l.id = cl.lesson_id
        WHERE l.course_id = ?
        GROUP BY l.id, l.title, l.order_number
        ORDER BY l.order_number ASC
    `;
    db.query(sql, [courseId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка генерації аналітики" });
        res.json(results);
    });
});

// 4. ПАНЕЛЬ ВИКЛАДАЧА (СТВОРЕННЯ КУРСІВ ТА УРОКІВ)
app.get('/api/teacher/:teacherId/courses', (req, res) => {
    const teacherId = req.params.teacherId;
    const sql = "SELECT * FROM courses WHERE teacher_id = ? ORDER BY id DESC";
    db.query(sql, [teacherId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        res.json(results);
    });
});

app.post('/api/courses', upload.single('image_file'), (req, res) => {
    const { title, description, image_url, duration, category, level, price, teacher_id } = req.body;
    const finalImageUrl = req.file ? `http://localhost:3000/uploads/${req.file.filename}` : image_url;

    const sql = `
        INSERT INTO courses (title, description, image_url, duration, category, level, price, teacher_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [title, description, finalImageUrl, duration, category, level, price, teacher_id], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: `Курс з назвою "${title}" вже існує! Придумайте іншу.` });
            }
            return res.status(500).json({ success: false, message: "Помилка при збереженні курсу" });
        }
        res.json({ success: true, message: "Курс успішно додано!", courseId: result.insertId });
    });
});

app.get('/api/courses/:courseId/lessons', (req, res) => {
    const courseId = req.params.courseId;
    const sql = "SELECT * FROM lessons WHERE course_id = ? ORDER BY order_number ASC";
    db.query(sql, [courseId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        res.json(results);
    });
});

app.post('/api/lessons', (req, res) => {
    const { course_id, title, video_url, order_number, content, quiz_data } = req.body;
    const quizString = quiz_data ? JSON.stringify(quiz_data) : null; 

    const sql = `
        INSERT INTO lessons (course_id, title, video_url, order_number, content, quiz_data) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [course_id, title, video_url, order_number, content || '', quizString], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Помилка сервера" });
        res.json({ success: true, message: "Урок успішно додано!" });
    });
});

app.put('/api/lessons/:id', (req, res) => {
    const lessonId = req.params.id;
    const { title, video_url, content, quiz_data } = req.body;
    const quizString = quiz_data ? JSON.stringify(quiz_data) : null;

    const sql = `UPDATE lessons SET title = ?, video_url = ?, content = ?, quiz_data = ? WHERE id = ?`;
    
    db.query(sql, [title, video_url, content, quizString, lessonId], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: "Помилка оновлення" });
        res.json({ success: true, message: "Урок успішно оновлено!" });
    });
});
app.put('/api/lessons/reorder', (req, res) => {
    const { lessons } = req.body;
    
    if (!lessons || !Array.isArray(lessons)) {
        return res.status(400).json({ success: false, message: "Невірний формат даних" });
    }

    let completed = 0;
    let hasError = false;

    lessons.forEach(lesson => {
        db.query('UPDATE lessons SET order_number = ? WHERE id = ?', [lesson.order_number, lesson.id], (err) => {
            if (err) hasError = true;
            
            completed++;
            if (completed === lessons.length) {
                if (hasError) return res.status(500).json({ success: false, message: "Помилка бази даних" });
                res.json({ success: true });
            }
        });
    });
});
app.post('/api/generate-quiz', async (req, res) => {
    const { 
        courseTitle, 
        lessonTitle, 
        content, 
        video_url,
        count = 3, 
        isMultiple = false 
    } = req.body;

    try {
        let transcriptText = "";

        if (video_url) {
            try {
                const transcript = await YoutubeTranscript.fetchTranscript(video_url);
                transcriptText = transcript.map(t => t.text).join(' ').substring(0, 15000);
            } catch (videoErr) {
                console.warn(`[ШІ Тести] Не вдалося завантажити субтитри для ${video_url}:`, videoErr.message);
            }
        }

        const typeDescription = isMultiple 
            ? "множинний вибір (може бути кілька правильних відповідей)" 
            : "одиночний вибір (тільки одна правильна відповідь)";

        const promptText = `
            Ти Senior методист. Створи ${count} питань для тесту у форматі JSON.
            Тип питань: ${typeDescription}.
            Курс: "${courseTitle}". Урок: "${lessonTitle}".
            
            ДЖЕРЕЛА ІНФОРМАЦІЇ ДЛЯ ПИТАНЬ:
            1. Конспект викладача: "${content || 'не надано'}".
            2. Субтитри з відео: "${transcriptText || 'не надано'}".
            
            НАЙГОЛОВНІШІ ПРАВИЛА:
            1. Питання мають бути створені СУВОРО на основі Конспекту або Субтитрів.
            2. РОЗМІШУЙ ПРАВИЛЬНІ ВІДПОВІДІ! Правильна відповідь НЕ має бути завжди першою (з індексом 0). Випадково розподіляй правильні індекси (наприклад: 0, 2, 1 або 3). Це критично важливо!
            
            Поверни ТІЛЬКИ чистий JSON масив об'єктів без маркдауну (\`\`\`json).
            Формат:
            [
              {
                "question": "текст питання",
                "options": ["варіант 1", "варіант 2", "варіант 3", "варіант 4"],
                "correctIndexes": [2] // Випадковий індекс правильної відповіді (від 0 до 3)
              }
            ]
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: "user", content: promptText }],
            model: "llama-3.3-70b-versatile",
            temperature: 0.4,
            response_format: { type: "json_object" } 
        });

        const contentRaw = chatCompletion.choices[0].message.content;
        
        const jsonString = contentRaw.replace(/```json/g, '').replace(/```/g, '').trim();
        const quizData = JSON.parse(jsonString);

        const finalData = Array.isArray(quizData) ? quizData : (quizData.questions || quizData.quiz);

        res.json({ success: true, quiz: finalData });
    } catch (error) {
        console.error("Помилка генерації тестів ШІ:", error);
        res.status(500).json({ success: false, message: "Помилка генерації" });
    }
});


// 5. КАБІНЕТ СТУДЕНТА ТА НАВЧАННЯ

app.post('/api/enroll', (req, res) => {
    const { student_id, course_id } = req.body;
    
    const checkSql = "SELECT * FROM enrollments WHERE student_id = ? AND course_id = ?";
    db.query(checkSql, [student_id, course_id], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка перевірки" });
        
        if (results.length > 0) {
            return res.json({ success: true, message: "Ви вже записані на цей курс", alreadyEnrolled: true });
        }
        
        const insertSql = "INSERT INTO enrollments (student_id, course_id, progress_percent) VALUES (?, ?, 0)";
        db.query(insertSql, [student_id, course_id], (err, result) => {
            if (err) return res.status(500).json({ error: "Помилка при записі на курс" });
            res.json({ success: true, message: "Успішно записано на курс!" });
        });
    });
});

app.post('/api/refund', (req, res) => {
    const { student_id, course_id } = req.body;

    const sqlDeleteEnrollment = 'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?';
    db.query(sqlDeleteEnrollment, [student_id, course_id], (err) => {
        if (err) return res.status(500).json({ success: false, error: "Помилка при скасуванні доступу" });

        const sqlClearProgress = 'DELETE FROM completed_lessons WHERE student_id = ? AND course_id = ?';
        db.query(sqlClearProgress, [student_id, course_id], (err) => {
            if (err) console.error("Помилка очищення прогресу:", err);
            res.json({ success: true, message: 'Кошти повернуто, доступ закрито, прогрес очищено' });
        });
    });
});

app.get('/api/dashboard/:userId', (req, res) => {
    const userId = req.params.userId;
    const sql = `
        SELECT 
            courses.id, courses.title, courses.image_url, 
            enrollments.progress_percent 
        FROM enrollments
        JOIN courses ON enrollments.course_id = courses.id
        WHERE enrollments.student_id = ?
    `;
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        res.json(results);
    });
});

app.get('/api/progress/:courseId/:studentId', (req, res) => {
    const { courseId, studentId } = req.params;
    const sql = `
        SELECT cl.lesson_id 
        FROM completed_lessons cl
        JOIN lessons l ON cl.lesson_id = l.id
        WHERE cl.student_id = ? AND l.course_id = ?
    `;
    db.query(sql, [studentId, courseId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка сервера" });
        res.json(results.map(r => r.lesson_id)); 
    });
});
const activeSessions = {};
app.post('/api/lessons/start', (req, res) => {
    const { student_id, lesson_id } = req.body;
    
    // Записуємо час старту
    const sessionKey = `${student_id}_${lesson_id}`;
    activeSessions[sessionKey] = Date.now();
    
    res.json({ success: true, message: "Трекінг часу розпочато" });
});

// 2. Ендпоінт ЗАВЕРШЕННЯ уроку
app.post('/api/lessons/complete', (req, res) => {
    const { student_id, lesson_id, course_id, expected_duration_seconds } = req.body;

    db.query("SELECT role FROM users WHERE id = ?", [student_id], (err, userRes) => {
        if (err) return res.status(500).json({ error: "Помилка перевірки ролі" });
        if (userRes.length === 0) return res.status(404).json({ error: "Користувача не знайдено" });

        const userRole = userRes[0].role;
        const hasVipAccess = userRole === 'admin' || userRole === 'teacher';
        if (!hasVipAccess) {
            const sessionKey = `${student_id}_${lesson_id}`;
            const startTime = activeSessions[sessionKey];

            if (!startTime) {
                return res.status(403).json({ success: false, error: "Помилка Anti-Cheat: Час початку уроку не зафіксовано." });
            }

            const timeSpentSeconds = (Date.now() - startTime) / 1000;
            const minRequiredSeconds = expected_duration_seconds * 0.6; 

            if (timeSpentSeconds < minRequiredSeconds) {
                console.warn(`[ANTI-CHEAT] Студент ${student_id} намагався перемотати урок ${lesson_id}.`);
                return res.status(403).json({ 
                    success: false, 
                    error: "Зафіксовано швидку перемотку. Щоб завершити урок, перегляньте мінімум 60% матеріалу." 
                });
            }

            delete activeSessions[sessionKey];
        }

        const insertSql = "INSERT IGNORE INTO completed_lessons (student_id, lesson_id) VALUES (?, ?)";
        db.query(insertSql, [student_id, lesson_id], (err) => {
            if (err) return res.status(500).json({ error: "Помилка збереження прогресу" });

            db.query("SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?", [course_id], (err, totalRes) => {
                const totalLessons = totalRes[0].total;

                const completedSql = `
                    SELECT COUNT(*) AS completed 
                    FROM completed_lessons cl 
                    JOIN lessons l ON cl.lesson_id = l.id 
                    WHERE cl.student_id = ? AND l.course_id = ?
                `;
                db.query(completedSql, [student_id, course_id], (err, compRes) => {
                    const completedLessons = compRes[0].completed;
                    const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                    
                    db.query("UPDATE enrollments SET progress_percent = ? WHERE student_id = ? AND course_id = ?", 
                    [percent, student_id, course_id], (err) => {
                        res.json({ success: true, newPercent: percent });
                    });
                });
            });
        });
    });
});
// БЛОК КОММЕНТАРИЕВ К УРОКАМ
app.get('/api/lessons/:lessonId/comments', (req, res) => {
    const lessonId = req.params.lessonId;
    const sql = `
        SELECT c.*, u.full_name, u.role 
        FROM lesson_comments c 
        JOIN users u ON c.user_id = u.id 
        WHERE c.lesson_id = ? 
        ORDER BY c.created_at ASC
    `;
    
    db.query(sql, [lessonId], (err, results) => {
        if (err) return res.status(500).json({ error: "Помилка завантаження коментарів" });
        res.json(results);
    });
});

app.post('/api/comments', (req, res) => {
    const { lesson_id, user_id, comment_text, parent_id } = req.body;
    
    if (!comment_text || comment_text.trim() === "") {
        return res.status(400).json({ error: "Коментар не може бути порожнім" });
    }

    const sql = "INSERT INTO lesson_comments (lesson_id, user_id, comment_text, parent_id) VALUES (?, ?, ?, ?)";
    
    db.query(sql, [lesson_id, user_id, comment_text, parent_id || null], (err) => {
        if (err) return res.status(500).json({ error: "Помилка збереження коментаря" });

        if (parent_id) {
            const notifSql = `
                SELECT c.user_id, l.course_id, l.title 
                FROM lesson_comments c 
                JOIN lessons l ON c.lesson_id = l.id 
                WHERE c.id = ?
            `;
            db.query(notifSql, [parent_id], (err2, rows) => {
                if (rows.length > 0 && rows[0].user_id !== user_id) {
                    const msg = `Вам відповіли на коментар в уроці "${rows[0].title}"`;
                    const link = `/lesson/${rows[0].course_id}`;
                    db.query('INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)', [rows[0].user_id, msg, 'reply', link]);
                }
            });
        }
        res.json({ success: true, message: "Коментар додано!" });
    });
});

app.get('/api/reviews/:courseId', (req, res) => {
    const sql = `
        SELECT r.*, u.full_name 
        FROM reviews r 
        JOIN users u ON r.user_id = u.id 
        WHERE r.course_id = ? 
        ORDER BY r.created_at DESC`;
    
    db.query(sql, [req.params.courseId], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(results);
    });
});

app.post('/api/reviews', (req, res) => {
    const { course_id, user_id, rating, comment } = req.body;
    
    db.query('SELECT id FROM reviews WHERE course_id = ? AND user_id = ?', [course_id, user_id], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ success: false, error: "Ви вже залишали відгук на цей курс!" });
        }

        const sql = 'INSERT INTO reviews (course_id, user_id, rating, comment) VALUES (?, ?, ?, ?)';
        db.query(sql, [course_id, user_id, rating, comment], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Відгук успішно додано!" });
        });
    });
});

//        АДМИН-ПАНЕЛЬ (БИЗНЕС-ЛОГИКА)
const checkAdmin = (adminId, callback) => {
    if (!adminId) return callback(false);
    
    db.query('SELECT role FROM users WHERE id = ?', [adminId], (err, results) => {
        if (err || results.length === 0 || results[0].role !== 'admin') {
            return callback(false);
        }
        callback(true);
    });
};

app.get('/api/admin/users/:adminId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено. Тільки для адміністраторів." });
        
        const sql = 'SELECT id, full_name, email, role, created_at FROM users ORDER BY created_at DESC';
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
});

app.put('/api/admin/users/role', (req, res) => {
    const { adminId, targetUserId, newRole } = req.body;
    
    checkAdmin(adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Роль успішно змінено!" });
        });
    });
});

app.delete('/api/admin/users/:adminId/:targetUserId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        db.query('DELETE FROM users WHERE id = ?', [req.params.targetUserId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Користувача видалено з системи." });
        });
    });
});

app.get('/api/admin/courses/:adminId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        const sql = `
            SELECT c.id, c.title, c.category, c.price, c.status, u.full_name as teacher_name 
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            ORDER BY c.id DESC`;
            
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
});

app.delete('/api/admin/courses/:adminId/:courseId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        db.query('DELETE FROM courses WHERE id = ?', [req.params.courseId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, message: "Курс успішно видалено з платформи." });
        });
    });
});

app.put('/api/admin/courses/:adminId/:courseId/status', (req, res) => {
    const { status } = req.body;
    
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        db.query('UPDATE courses SET status = ? WHERE id = ?', [status, req.params.courseId], (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            db.query('SELECT teacher_id, title FROM courses WHERE id = ?', [req.params.courseId], (err2, rows) => {
                if (rows.length > 0) {
                    const statusText = status === 'published' ? 'схвалено та опубліковано!' : (status === 'rejected' ? 'відхилено.' : 'переведено на модерацію.');
                    const link = `/course/${req.params.courseId}`;
                    db.query('INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)', [rows[0].teacher_id, `Ваш курс "${rows[0].title}" було ${statusText}`, 'status', link]);
                }
            });

            res.json({ success: true, message: `Статус курсу змінено на ${status}` });
        });
    });
});

app.get('/api/admin/stats/:adminId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        const usersQuery = 'SELECT COUNT(*) as count FROM users';
        const coursesQuery = "SELECT COUNT(*) as count FROM courses WHERE status = 'published'";
        const revenueQuery = `
            SELECT SUM(c.price) as total 
            FROM enrollments e 
            JOIN courses c ON e.course_id = c.id`;

        db.query(usersQuery, (err1, r1) => {
            if (err1) return res.status(500).json({ error: err1.message });

            db.query(coursesQuery, (err2, r2) => {
                if (err2) return res.status(500).json({ error: err2.message });

                db.query(revenueQuery, (err3, r3) => {
                    let totalRev = 0;
                    if (!err3 && r3[0].total) totalRev = r3[0].total;

                    res.json({
                        totalUsers: r1[0].count || 0,
                        totalCourses: r2[0].count || 0,
                        totalRevenue: totalRev
                    });
                });
            });
        });
    });
});

app.get('/api/admin/finances/:adminId', (req, res) => {
    checkAdmin(req.params.adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });
        
        const sql = `
            SELECT 
                u.id as teacher_id, 
                u.full_name as teacher_name, 
                u.card_number,
                COUNT(e.id) as sales_count,
                IFNULL(SUM(c.price), 0) as total_earned
            FROM users u
            JOIN courses c ON u.id = c.teacher_id
            JOIN enrollments e ON c.id = e.course_id
            WHERE (u.role = 'teacher' OR u.role = 'admin') 
              AND (e.is_paid = FALSE OR e.is_paid IS NULL)
            GROUP BY u.id, u.full_name, u.card_number
            HAVING total_earned > 0
            ORDER BY total_earned DESC
        `;
        
        db.query(sql, (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        });
    });
});

app.post('/api/admin/payouts', (req, res) => {
    const { adminId, teacherId } = req.body;
    
    checkAdmin(adminId, (isAdmin) => {
        if (!isAdmin) return res.status(403).json({ success: false, error: "Доступ заборонено." });

        const sql = `
            UPDATE enrollments e
            JOIN courses c ON e.course_id = c.id
            SET e.is_paid = TRUE
            WHERE c.teacher_id = ? AND (e.is_paid = FALSE OR e.is_paid IS NULL)
        `;
        
        db.query(sql, [teacherId], (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });

            // ОНОВЛЕНО: Формуємо сповіщення з лінком на профіль
            const link = '/profile';
            db.query('INSERT INTO notifications (user_id, message, type, link) VALUES (?, ?, ?, ?)', [teacherId, `Вам відправлено гонорар за продаж курсів! Перевірте баланс вашої картки.`, 'payout', link]);

            res.json({ success: true, message: "Виплату успішно зафіксовано!" });
        });
    });
});

//        СИСТЕМА РЕКОМЕНДАЦІЙ
app.get('/api/recommendations/:userId', (req, res) => {
    const userId = req.params.userId;

    const prefSql = `
        SELECT DISTINCT c.category 
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = ?
    `;

    db.query(prefSql, [userId], (err, prefResults) => {
        if (err) return res.status(500).json({ error: "Помилка аналізу вподобань" });

        const favoriteCategories = prefResults.map(p => p.category);
        
        const getCoursesSql = (useCategoryFilter) => `
            SELECT c.*, u.full_name as teacher_name, 
            IFNULL(AVG(r.rating), 0) as average_rating,
            COUNT(r.id) as review_count
            FROM courses c
            LEFT JOIN users u ON c.teacher_id = u.id
            LEFT JOIN reviews r ON c.id = r.course_id
            WHERE c.status = 'published' 
            AND c.id NOT IN (SELECT course_id FROM enrollments WHERE student_id = ?)
            ${useCategoryFilter ? 'AND c.category IN (?)' : ''}
            GROUP BY c.id
            ORDER BY average_rating DESC, c.id DESC
            LIMIT 3
        `;

        if (favoriteCategories.length > 0) {
            db.query(getCoursesSql(true), [userId, favoriteCategories], (err, recResults) => {
                if (err) return res.status(500).json({ error: "Помилка генерації" });

                if (recResults.length === 0) {
                    db.query(getCoursesSql(false), [userId], (err, fallbackResults) => {
                        if (err) return res.status(500).json({ error: "Помилка фолбеку" });
                        return res.json(fallbackResults);
                    });
                } else {
                    res.json(recResults);
                }
            });
        } else {
            db.query(getCoursesSql(false), [userId], (err, topResults) => {
                if (err) return res.status(500).json({ error: "Помилка топ курсів" });
                res.json(topResults);
            });
        }
    });
});

// AI Ментор 
app.post('/api/mentor/chat', async (req, res) => {
    const { messages, student_id } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: "Невірний формат даних" });
    }
    db.query("SELECT id, title, category, level, duration, rating, image_url FROM courses WHERE status = 'published'", (err, courses) => {
        if (err) return res.status(500).json({ success: false, message: "Помилка БД" });

        db.query("SELECT course_id FROM enrollments WHERE student_id = ?", [student_id || 0], async (err, enrolled) => {
            if (err) return res.status(500).json({ success: false, message: "Помилка БД" });

            try {
                const catalogString = courses.map(c => `ID:${c.id} | Назва:"${c.title}" | Категорія:${c.category} | Рівень:${c.level}`).join('\n');
                const enrolledIds = enrolled.map(e => e.course_id);
                const enrolledString = enrolledIds.length > 0 ? enrolledIds.join(', ') : "Немає";

                const systemPrompt = `Ти - професійний AI-ментор платформи EasyLearn. Твоя мета - підібрати курс ТІЛЬКИ з наявного каталогу або ввічливо попрощатися, якщо клієнту нічого не підходить.

ДОСТУПНИЙ КАТАЛОГ КУРСІВ НА ПЛАТФОРМІ:
${catalogString}

ID КУРСІВ, ЯКІ ЦЕЙ СТУДЕНТ ВЖЕ ПРОХОДИТЬ: [${enrolledString}]

ВОРОНКА ТА ПРАВИЛА:
1. КАТАЛОГ: НІКОЛИ не вигадуй курси. Якщо клієнт просить Java, а її немає, запропонуй суміжні (напр. Python чи Node.js). Не пропонуй дизайн як заміну програмуванню!
2. РІВЕНЬ: Якщо клієнт просить курс (напр. Python) рівня "Просунутий", а в каталозі є тільки "Для початківців", чесно скажи про це і запропонуй наявний рівень.
3. ВІДМОВА (КРИТИЧНО): Якщо клієнт відмовляється від запропонованих альтернатив (каже "ні", "не хочу", "дякую"), НЕ НАВ'ЯЗУЙ інші категорії. Ввічливо скажи: "Зрозумів вас! На жаль, наразі у нас немає потрібного курсу, але каталог постійно оновлюється. Гарного дня! Якщо захочете пошукати щось інше — просто почніть чат спочатку." Одразу став status: "ready" та порожній масив recommended_course_ids: [].
4. ВЖЕ КУПЛЕНО: Якщо обраний курс вже є у списку "ВЖЕ ПРОХОДИТЬ", скажи: "Ви вже проходите цей курс! Продовжуйте навчання в кабінеті." і став status: "ready" з порожнім масивом [].
5. УСПІХ: Коли клієнт погодився на конкретний курс з каталогу, став status: "ready" і вкажи його ID у recommended_course_ids.

ФОРМАТ ВІДПОВІДІ (ТІЛЬКИ JSON):
{
  "status": "clarifying", // або "ready", якщо підібрав курс АБО якщо клієнт відмовився від усього
  "replyText": "Твоя відповідь клієнту.",
  "options": ["Варіант 1", "Варіант 2"], // Кнопки-підказки
  "recommended_course_ids": [] // ТІЛЬКИ для "ready". ID знайдених курсів. Якщо клієнт відмовився або курс вже куплено - залиш масив порожнім: []
}`;

                const history = messages.map(m => ({ role: m.role, content: m.content }));

                const chatCompletion = await groq.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }, ...history],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1, 
                    response_format: { type: "json_object" }
                });

                const parsedData = JSON.parse(chatCompletion.choices[0]?.message?.content);

                if (parsedData.status === "ready" && parsedData.recommended_course_ids) {
                    parsedData.recommended_courses = courses.filter(c => parsedData.recommended_course_ids.includes(c.id));
                }

                res.json({ success: true, aiData: parsedData });

            } catch (error) {
                console.error("❌ Помилка API (Ліміти або зв'язок):", error.message);
                res.status(500).json({ success: false, message: "ШІ тимчасово недоступний" });
            }
        });
    });
});

// 1. ОТРИМАННЯ КУРСІВ ДЛЯ АРЕНИ 
app.get('/api/arena/courses/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    const sql = `
        SELECT c.id, c.title, c.category, c.image_url,
               (SELECT COUNT(cl.lesson_id) 
                FROM completed_lessons cl 
                JOIN lessons l ON cl.lesson_id = l.id 
                WHERE l.course_id = c.id 
                  AND cl.student_id = ? 
                  AND l.transcript_text IS NOT NULL 
                  AND TRIM(l.transcript_text) != '') AS eligible_lessons
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ?
    `;
    db.query(sql, [studentId, studentId], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Помилка БД" });
        res.json({ success: true, courses: results });
    });
});

// 2. ГЕНЕРАЦІЯ БАТЛУ ТА ПОШУК "ПРИВИДА"
app.post('/api/arena/generate', (req, res) => {
    const { course_id, student_id } = req.body;

    const sqlSelectLesson = `
        SELECT l.title, l.transcript_text 
        FROM lessons l
        JOIN completed_lessons cl ON l.id = cl.lesson_id
        WHERE l.course_id = ? AND cl.student_id = ?
          AND l.transcript_text IS NOT NULL AND TRIM(l.transcript_text) != '' 
        ORDER BY RAND() LIMIT 1
    `;
    
    db.query(sqlSelectLesson, [course_id, student_id], async (err, results) => {
        if (err) return res.status(500).json({ success: false, error: "Помилка БД" });
        if (results.length === 0) return res.status(400).json({ success: false, message: "Ви ще не пройшли жодного уроку з текстом у цьому курсі." });

        const { title, transcript_text } = results[0];
        const safeTranscript = transcript_text.substring(0, 12000);

        try {
            const systemPrompt = `Ти - Senior геймдизайнер освітніх арен. Створи 5 логічних бліц-питань для ПВП-батлу на основі транскрипту уроку "${title}".
ПРАВИЛА:
1. Питання мають перевіряти реальні знання з тексту. Формулювання короткі (до 10-12 слів).
2. Надай РІВНО 4 варіанти відповіді. УСІ 4 ВАРІАНТИ МАЮТЬ БУТИ АБСОЛЮТНО УНІКАЛЬНИМИ.
3. Тільки 1 варіант правильний.
ТЕКСТ УРОКУ: "${safeTranscript}"
Поверни ТІЛЬКИ чистий JSON без маркдауну:
{ "questions": [ { "question": "?", "options": ["1", "2", "3", "4"], "correctIndex": 0 } ] }`;

            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "system", content: systemPrompt }],
                model: "llama-3.3-70b-versatile", 
                temperature: 0.1,
                response_format: { type: "json_object" }
            });

            const arenaQuiz = JSON.parse(chatCompletion.choices[0]?.message?.content);
            if (!arenaQuiz.questions) throw new Error("Невірний формат від AI");

            db.query("SELECT * FROM arena_ghosts WHERE course_id = ?", [course_id], (err, ghostRes) => {
                let opponent;
                
                if (!err && ghostRes.length > 0) {
                    opponent = {
                        name: ghostRes[0].student_name,
                        correctAnswers: ghostRes[0].score,
                        timeSpent: ghostRes[0].time_spent,
                        isReal: true
                    };
                } else {
                    opponent = {
                        name: `Бот-Студент_${Math.floor(Math.random() * 900 + 100)}`,
                        correctAnswers: Math.floor(Math.random() * 4) + 1,
                        timeSpent: Math.floor(Math.random() * 20) + 15,
                        isReal: false
                    };
                }

                res.json({ success: true, lessonTitle: title, quiz: arenaQuiz.questions, opponent: opponent });
            });

        } catch (error) {
            console.error("Помилка генерації батлу:", error.message);
            res.status(500).json({ success: false, message: "ШІ-модуль Арени тимчасово недоступний." });
        }
    });
});

// 3. ЗБЕРЕЖЕННЯ РЕЗУЛЬТАТУ 
app.post('/api/arena/save-result', (req, res) => {
    const { course_id, student_name, score, time_spent } = req.body;
    
    const sql = `
        REPLACE INTO arena_ghosts (course_id, student_name, score, time_spent) 
        VALUES (?, ?, ?, ?)
    `;
    db.query(sql, [course_id, student_name, score, time_spent], (err) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});
// ІНТЕГРАЦІЯ З ПРИВАТБАНКОМ (LIQPAY SANDBOX)
app.post('/api/payment/init', (req, res) => {
    const { student_id, course_id, amount } = req.body;

    const order_id = `order_${Date.now()}_${student_id}_${course_id}`;
    const publicKey = 'sandbox_i20587598624'; 
    const privateKey = 'sandbox_rJsfugsaSSuD7konMajULso2Iwla5dABIDqoanRd';

    console.log("Генеруємо платіж для ключа:", publicKey); 

    const jsonParams = {
        public_key: publicKey,
        version: '3',
        action: 'pay',
        amount: Number(amount), 
        currency: 'UAH',
        description: `Payment for course ID: ${course_id}`, 
        order_id: order_id,
        sandbox: 1, 
        result_url: `http://site.local:3000/api/payment/local-success?student_id=${student_id}&course_id=${course_id}`
    };
    const data = Buffer.from(JSON.stringify(jsonParams), 'utf8').toString('base64');
    const signatureString = privateKey + data + privateKey;
    const signature = crypto.createHash('sha1').update(signatureString, 'utf8').digest('base64');

    res.json({ success: true, data, signature });
});

app.get('/api/payment/local-success', (req, res) => {
    const { student_id, course_id } = req.query;

    if (!student_id || !course_id) {
        return res.send("Помилка даних платежу. Поверніться на головну.");
    }

    const insertSql = "INSERT IGNORE INTO enrollments (student_id, course_id, progress_percent) VALUES (?, ?, 0)";
    db.query(insertSql, [student_id, course_id], (err) => {
        if (err) {
            console.error("Помилка запису купленого курсу:", err);
            return res.send("Помилка бази даних. Зверніться до підтримки.");
        }

        res.redirect(`http://site.local:5173/lesson/${course_id}`);
    });
});
// 6. ЗАПУСК СЕРВЕРА
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Бэкенд-сервер працює на порту ${PORT}`);
});