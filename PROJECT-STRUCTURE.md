# 📋 Структура проекта StockTwits Scraper

## Описание проекта

StockTwits Scraper - это автоматизированная система для сбора данных с сайта StockTwits.com. Проект позволяет отслеживать количество watchers (наблюдателей) и цены акций по символам, сохранять данные в базу и предоставляет веб-интерфейс для управления.

## 📁 Структура файлов

### Основные файлы

#### `package.json` - Конфигурация Node.js проекта
- **Описание**: Определяет зависимости, скрипты запуска и метаданные проекта
- **Зависимости**:
  - `express` - веб-сервер
  - `puppeteer` - автоматизация браузера
  - `node-cron` - планировщик задач
  - `sqlite3` - база данных
  - `body-parser`, `cors` - middleware для Express
  - `ejs` - шаблонизатор

#### `server.js` - Главный серверный файл

**Глобальные переменные:**
- `const app = express()` - экземпляр Express приложения
- `const PORT = process.env.PORT || 3000` - порт сервера
- `let db` - подключение к SQLite базе данных
- `let browser` - экземпляр Puppeteer браузера
- `let isScrapingActive = false` - флаг активного скрейпинга
- `let scheduledJobs = new Map()` - карта запланированных задач

**Настройка middleware:**
- `app.use(bodyParser.json())` - парсинг JSON запросов
- `app.use(cors())` - разрешение CORS запросов
- `app.use(express.static('public'))` - статические файлы
- `app.set('view engine', 'ejs')` - настройка шаблонизатора

**Функции базы данных:**

**`initDatabase()`**
```javascript
// Создает директорию data/ если не существует
// Подключается к SQLite базе данных stocktwits.db
// Создает таблицы: symbols, scraped_data, scraping_logs
// Добавляет миграции для совместимости старых версий
// Вставляет тестовые символы CLSK и HIVE с настройками
// Возвращает Promise для асинхронной обработки
```

**`migrateDatabase()`**
```javascript
// Проверяет существование колонки metadata в scraped_data
// Добавляет колонку если её нет (для обратной совместимости)
// Обрабатывает ошибки SQL при миграции
```

**Функции Puppeteer:**

**`initializeBrowser()`**
```javascript
// Запускает браузер Puppeteer с настройками:
//   - headless: true (без GUI)
//   - args: ['--no-sandbox', '--disable-setuid-sandbox']
// Сохраняет экземпляр в глобальную переменную browser
// Обрабатывает ошибки инициализации
```

**Главная функция скрейпинга:**

**`scrapeStockTwits(symbol, selector)`**
```javascript
// Параметры:
//   - symbol: символ акции (CLSK, HIVE, etc.)
//   - selector: CSS селектор для поиска (по умолчанию 'watchers')

// 1. Создает новую страницу в браузере
// 2. Переходит на https://stocktwits.com/symbol/${symbol}
// 3. Ждет загрузки (networkidle2) + 3 секунды

// 4. УНИВЕРСАЛЬНЫЙ АЛГОРИТМ ПОИСКА WATCHERS:
//    Стратегия 1: Поиск по специфическим CSS селекторам
//      - .SymbolWatchers_watchers__sp1FU
//      - [class*="SymbolWatchers_watchers"]
//      - [class*="watchers"]
//
//    Стратегия 2: Контекстуальный поиск через TreeWalker
//      - Ищет числа в форматах: 1,234 / 1234 / 1.2K / 12K / 1M
//      - Фильтрует диапазон: 500-500,000
//      - Проверяет иерархию элементов (5-8 уровней)
//      - Ищет контекст: "SymbolWatchers", "watchers", "SymbolInfo"
//      - Приоритизирует: watcher-related > symbol-info

// 5. ПОИСК ЦЕН:
//    - Селекторы: .SymbolPricing_updatedAmountFont__3N7up, [class*="price"]
//    - Паттерн: $9.08 (исключая проценты)
//    - TreeWalker поиск по всем текстовым узлам

// 6. ПОИСК ПОСТОВ (если selector не 'watchers'):
//    - Извлекает контент, автора, временные метки, лайки
//    - Фильтрует посты короче 10 символов

// 7. СОХРАНЕНИЕ ДАННЫХ:
//    - Основные данные (watchers, price) → saveScrapedData()
//    - Посты по отдельности → saveScrapedData()
//    - Логи операции → logScraping()

// Возвращает: { watchers, price, posts }
```

**Функции работы с данными:**

**`saveScrapedData(symbol, data)`**
```javascript
// Вставляет запись в таблицу scraped_data
// Параметры data:
//   - content: текстовое содержимое
//   - author: автор (для постов)
//   - timestamp: время сбора
//   - likes: количество лайков
//   - metadata: JSON с дополнительными данными
// Возвращает Promise с lastID
```

**`logScraping(symbol, status, message)`**
```javascript
// Записывает лог операции в scraping_logs
// status: 'success' | 'error'
// message: описание результата или ошибки
// timestamp: автоматически добавляется текущее время
```

**Функции планировщика:**

**`scheduleSymbolScraping(symbol, selector, schedule)`**
```javascript
// Создает запланированную задачу через node-cron
// schedule: cron формат (по умолчанию '*/15 * * * *' = каждые 15 минут)
// Сохраняет задачу в scheduledJobs Map
// При выполнении запускает scrapeStockTwits()
// Логирует результаты выполнения
```

**`loadScheduledJobs()`**
```javascript
// Загружает все активные символы из базы данных
// Для каждого символа создает запланированную задачу
// Выводит количество загруженных задач
```

**API Routes (REST endpoints):**

**`GET /`**
```javascript
// Рендерит главную страницу (views/index.ejs)
// Передает переменные: title, isScrapingActive
```

**`GET /api/symbols`**
```javascript
// Возвращает JSON список всех символов из базы данных
// SELECT * FROM symbols ORDER BY created_at DESC
```

**`POST /api/symbols`**
```javascript
// Добавляет новый символ в базу данных
// Body: { symbol, selector, schedule }
// Проверяет уникальность символа
// Автоматически создает запланированную задачу
// Возвращает: success или error
```

**`DELETE /api/symbols/:symbol`**
```javascript
// Удаляет символ из базы данных
// Останавливает запланированную задачу
// Удаляет задачу из scheduledJobs Map
```

**`POST /api/scrape-symbol`**
```javascript
// Ручной запуск скрейпинга для одного символа
// Body: { symbol, selector }
// Вызывает scrapeStockTwits()
// Возвращает результат или ошибку
```

**`POST /api/check-watchers`**
```javascript
// Массовая проверка всех активных символов
// Получает список символов из базы
// Запускает scrapeStockTwits() для каждого
// Собирает результаты в массив
// Возвращает общий результат проверки
```

**`POST /api/toggle-scraping`**
```javascript
// Переключает глобальный флаг isScrapingActive
// Управляет активностью автоматического скрейпинга
```

**Функции инициализации:**

**`initialize()`**
```javascript
// Последовательно запускает:
// 1. initDatabase() - инициализация базы данных
// 2. initializeBrowser() - запуск Puppeteer
// 3. loadScheduledJobs() - загрузка запланированных задач
// 4. app.listen() - запуск Express сервера
// Обрабатывает ошибки на каждом этапе
```

**Обработка сигналов процесса:**
```javascript
// process.on('SIGINT') - Ctrl+C
// process.on('SIGTERM') - завершение процесса
// process.on('uncaughtException') - необработанные исключения
// Корректно закрывает браузер и базу данных перед завершением
```

### Веб-интерфейс

#### `views/index.ejs` - HTML шаблон главной страницы
- **Описание**: Главная страница веб-интерфейса
- **Разделы**:
  - Заголовок с названием проекта
  - Форма добавления новых символов
  - Сетка карточек с текущими символами
  - Кнопка массовой проверки "Check Watchers"
  - Область отображения результатов

#### `public/css/style.css` - Стили интерфейса
- **Описание**: CSS стили для веб-интерфейса
- **Особенности**:
  - Современный дизайн с использованием CSS Grid
  - Карточки символов с hover эффектами
  - Адаптивный дизайн для мобильных устройств
  - Цветовые индикаторы статуса (зеленый/красный)
  - Анимации загрузки

**Основные классы:**
- `.symbol-card` - карточка символа
- `.btn-large` - большая кнопка проверки
- `.check-result` - блок с результатами
- `.symbol-actions` - кнопки действий для символа

#### `public/js/app.js` - Клиентский JavaScript

**Класс StockTwitsScraper:**

**Конструктор и инициализация:**
```javascript
constructor() {
    this.currentPage = 1;           // Текущая страница данных
    this.pageSize = 100;            // Количество записей на страницу
    this.currentSymbolFilter = '';  // Фильтр по символу
    this.init();                    // Запуск инициализации
}

init() {
    // Привязка событий к элементам интерфейса
    // Загрузка начальных данных (символы, статус, данные, логи)
    // Запуск автообновления статуса каждые 5 секунд
}
```

**Обработка событий (bindEvents):**
```javascript
// События упрощенного интерфейса:
- addSymbolBtn.click → handleAddSymbol()
- symbolInput.keypress(Enter) → handleAddSymbol()
- checkAllBtn.click → checkAllSymbols()

// События управления скрейпингом:
- startBtn.click → startScraping()
- stopBtn.click → stopScraping()

// События интерфейса вкладок:
- tab-button.click → switchTab()
- symbolFilter.change → фильтрация данных
- refreshData/refreshLogs → обновление данных
- prevPage/nextPage → пагинация

// Модальные окна:
- .close/.modalCancel → closeModal()
```

**Управление символами:**

**`handleAddSymbol()`**
```javascript
// 1. Получает символ из input поля
// 2. Валидирует ввод (не пустой, преобразует в UPPERCASE)
// 3. Создает объект с настройками по умолчанию:
//    - selector: 'watchers'
//    - schedule: '*/15 * * * *' (каждые 15 минут)
// 4. POST запрос на /api/symbols
// 5. Показывает уведомление о результате
// 6. Обновляет список символов
```

**`loadSymbols()`**
```javascript
// 1. GET запрос на /api/symbols
// 2. Вызывает renderSymbolsGrid() для отображения
// 3. Обновляет фильтр символов
// 4. Обрабатывает ошибки сети
```

**`renderSymbolsGrid(symbols)`**
```javascript
// Создает сетку карточек символов с:
// - Заголовком (название символа)
// - Датой добавления
// - Кнопкой "Check Now" для одиночной проверки
// - Кнопкой удаления "×" в углу
// - Показывает заглушку если символов нет
```

**`deleteSymbol(id, symbol)`**
```javascript
// 1. Показывает модальное окно подтверждения
// 2. При подтверждении: DELETE запрос на /api/symbols/${id}
// 3. Показывает результат операции
// 4. Обновляет список символов
```

**Проверка watchers:**

**`checkSingleSymbol(symbol)`**
```javascript
// 1. Показывает статус "Checking..."
// 2. POST запрос на /api/scrape/manual/${symbol}
// 3. Получает последние данные GET /api/data/${symbol}?limit=1
// 4. Парсит metadata из результата
// 5. Отображает результат:
//    - Успех: символ ✓, watchers, price
//    - Ошибка: символ ❌, сообщение об ошибке
// 6. Обновляет общую таблицу данных если нужно
```

**`checkAllSymbols()`**
```javascript
// 1. Получает список всех символов
// 2. Показывает индикатор загрузки на кнопке
// 3. Последовательно для каждого символа:
//    - POST запрос на скрейпинг
//    - Ожидание 1 секунду
//    - Получение данных из базы
//    - Сохранение результата в массив results[]
// 4. Отображает сводные результаты для всех символов
// 5. Показывает статистику (X из Y успешных)
// 6. Восстанавливает состояние кнопки
```

**Управление скрейпингом:**

**`startScraping()`**
```javascript
// POST запрос на /api/scraping/start
// Запускает автоматический скрейпинг по расписанию
// Обновляет статус индикатор
```

**`stopScraping()`**
```javascript
// POST запрос на /api/scraping/stop  
// Останавливает автоматический скрейпинг
// Обновляет статус индикатор
```

**`loadScrapingStatus()`**
```javascript
// GET запрос на /api/scraping/status
// Обновляет элементы интерфейса:
// - Текст статуса ("Running (X jobs)" / "Stopped")
// - Цветовой индикатор (зеленый/красный)
// - Состояние кнопок Start/Stop (активная/неактивная)
```

**Работа с данными:**

**`loadData()`**
```javascript
// GET запрос на /api/data с параметрами:
// - Фильтр по символу (если выбран)
// - limit/offset для пагинации
// Вызывает renderDataTable() и updatePagination()
```

**`renderDataTable(data)`**
```javascript
// Заполняет таблицу данных строками:
// - symbol: символ акции
// - content: содержимое (watchers/price)
// - author: источник данных  
// - timestamp: время публикации
// - likes: количество лайков
// - scraped_at: время сбора данных
```

**`loadLogs()`** / **`renderLogsTable(logs)`**
```javascript
// Аналогично для таблицы логов:
// - symbol, status (success/error), message, created_at
// - Цветовая индикация статуса (зеленый/красный)
```

**Интерфейс и навигация:**

**`switchTab(tabName)`**
```javascript
// Переключение между вкладками:
// - Убирает класс 'active' со всех вкладок
// - Добавляет 'active' к выбранной вкладке
// - Загружает данные для вкладки (data/logs)
```

**`prevPage()` / `nextPage()`**
```javascript
// Навигация по страницам:
// - Изменяет this.currentPage
// - Вызывает loadData() для загрузки новой страницы
```

**`updatePagination(dataLength)`**
```javascript
// Обновляет состояние кнопок пагинации:
// - Отключает "Previous" на первой странице
// - Отключает "Next" если данных меньше pageSize
// - Показывает номер текущей страницы
```

**Утилиты интерфейса:**

**`showNotification(message, type)`**
```javascript
// Создает всплывающее уведомление:
// - Позиция: фиксированная справа сверху
// - Типы: success (зеленый), error (красный), info (синий)
// - Автоматически скрывается через 3 секунды
// - Анимация появления/исчезновения
```

**`showConfirmModal(title, message)`**
```javascript
// Показывает модальное окно подтверждения:
// - Возвращает Promise<boolean>
// - true - пользователь подтвердил
// - false - пользователь отменил
// - Управляет обработчиками событий кнопок
```

**`escapeHtml(text)`**
```javascript
// Экранирует HTML символы для безопасного вывода
// Использует textContent для преобразования
```

**Глобальный объект:**
```javascript
const scraper = new StockTwitsScraper();
// Создается глобальный экземпляр для использования в onclick событиях
```

### База данных

#### `scraper.db` - SQLite база данных
**Таблицы:**

**`symbols`**
- `id` - уникальный идентификатор
- `symbol` - символ акции (CLSK, HIVE)
- `selector` - CSS селектор для скрейпинга
- `schedule` - расписание проверок (cron формат)
- `active` - статус активности (1/0)
- `created_at` - дата создания

**`scraped_data`**
- `id` - уникальный идентификатор
- `symbol` - символ акции
- `content` - собранные данные
- `author` - источник данных
- `timestamp` - время сбора
- `likes` - количество лайков (для постов)
- `metadata` - дополнительные данные (JSON)

**`scraping_logs`**
- `id` - уникальный идентификатор
- `symbol` - символ акции
- `status` - статус операции (success/error)
- `message` - сообщение/описание
- `timestamp` - время операции

### Тестовые файлы

#### `test-clsk.js` - Тестирование скрейпинга CLSK
**Назначение:** Тестирование специфичного алгоритма для страницы CLSK
```javascript
async function testCLSKScraping() {
    // 1. Запускает Puppeteer в видимом режиме (headless: false)
    // 2. Переходит на https://stocktwits.com/symbol/CLSK
    // 3. Ждет загрузки и дополнительно 3 секунды
    
    // 4. АЛГОРИТМ ПОИСКА WATCHERS:
    const watchersCount = await page.evaluate(() => {
        // Стратегия 1: Специфические селекторы
        const specificSelectors = [
            '.SymbolWatchers_watchers__sp1FU',
            '[class*="SymbolWatchers_watchers"]',
            '[class*="watchers"]',
            '[class*="Watchers"]'
        ];
        
        // Стратегия 2: Поиск через TreeWalker
        // Ищет числа вида "5X,XXX" для CLSK (51,527)
        // Проверяет паттерн /\b5[0-9],\d{3}\b/
        
        // 5. Возвращает найденное число
    });
    
    // 6. Поиск цены через селекторы [class*="price"]
    // 7. Возврат результата: { watchers, price, success }
}

// Результат: ✅ Успешно находит 51,527 watchers
```

#### `test-hive.js` - Тестирование скрейпинга HIVE  
**Назначение:** Аналогичный тест для символа HIVE
```javascript
async function testHIVEScraping() {
    // Идентичная структура с test-clsk.js
    // Отличие: ищет паттерн /\b2[0-9],\d{3}\b/ для HIVE (24,589)
    // URL: https://stocktwits.com/symbol/HIVE
}

// Результат: ✅ Успешно находит 24,589 watchers
```

#### `test-generic.js` - Тестирование универсального алгоритма
**Назначение:** Проверка нового универсального алгоритма на разных символах
```javascript
async function testGenericAlgorithm() {
    const symbols = ['CLSK', 'HIVE', 'NVDA'];
    
    for (const symbol of symbols) {
        // Использует ТОЧНО такой же алгоритм как в server.js:
        const watchersCount = await page.evaluate(() => {
            // 1. Поиск по SymbolWatchers селекторам
            // 2. Контекстуальный поиск через TreeWalker:
            //    - Числа в диапазоне 500-500,000
            //    - Проверка иерархии элементов 
            //    - Поиск watcher-контекста
            //    - Приоритизация результатов
        });
    }
}

// Результат: 
// ✅ CLSK: 51,527 (работает)
// ❌ HIVE: N/A (не работает)
// ❌ NVDA: N/A (не работает)
```

#### `analyze-structure.js` - Анализ HTML структуры страниц
**Назначение:** Глубокий анализ DOM структуры для создания универсального алгоритма
```javascript
async function analyzeHTMLStructure() {
    const symbols = ['CLSK', 'HIVE', 'NVDA', 'TSLA', 'AAPL'];
    
    for (const symbol of symbols) {
        const analysis = await page.evaluate(() => {
            // 1. ПОИСК ПОТЕНЦИАЛЬНЫХ WATCHERS:
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );
            
            // 2. Для каждого текстового узла:
            while (node = walker.nextNode()) {
                const numberMatch = text.match(/\b\d{1,3}(,\d{3})*\b/);
                
                if (numberMatch) {
                    const number = parseInt(numberMatch[0].replace(/,/g, ''));
                    
                    // Фильтр: числа 1K-100K (потенциальные watchers)
                    if (number >= 1000 && number <= 100000) {
                        // 3. АНАЛИЗ КОНТЕКСТА:
                        const element = node.parentElement;
                        
                        // Сбор информации:
                        potentialWatchers.push({
                            number: match[0],
                            text: text,
                            tagName: element?.tagName,
                            className: element?.className,
                            cssPath: buildCSSPath(element), // Путь к элементу
                            contextWords: findWatcherKeywords(element)
                        });
                    }
                }
            }
            
            return {
                potentialWatchers: potentialWatchers,
                totalFound: potentialWatchers.length
            };
        });
    }
    
    // 4. АНАЛИЗ ПАТТЕРНОВ:
    // - Частота CSS путей
    // - Частота классов  
    // - Общие селекторы
    
    console.log('Most common CSS paths:');
    console.log('Most common classes:');
}

// Результаты анализа:
// ✅ Выявил ключевой селектор: .SymbolWatchers_watchers__sp1FU
// ✅ Нашел паттерны размещения в SymbolInfo секциях
// ✅ Выявил контекстные ключевые слова: "watcher", "watching"
```

### Документация

#### `GUI-USAGE.md` - Руководство пользователя
- **Язык**: Русский
- **Содержание**:
  - Инструкции по запуску
  - Как добавлять/удалять символы
  - Как проверять watchers
  - Примеры результатов

#### `PROJECT-STRUCTURE.md` (этот файл)
- Полное описание структуры проекта
- Документация всех функций
- Схема работы системы

### Системные папки

#### `node_modules/` - Зависимости Node.js
**Назначение:** Автоматически созданная папка с библиотеками проекта
```
node_modules/
├── express/          # Веб-сервер (4.18.2)
├── puppeteer/        # Автоматизация браузера (21.5.0)
├── sqlite3/          # SQLite драйвер (5.1.6)
├── node-cron/        # Планировщик задач (3.0.2)
├── body-parser/      # Парсер HTTP тел запросов
├── cors/             # CORS middleware
├── ejs/              # Шаблонизатор
└── [сотни других]    # Транзитивные зависимости
```

**Особенности:**
- **Размер**: Очень большая (сотни MB)
- **Создание**: `npm install` автоматически скачивает все зависимости
- **Не в git**: Добавлена в `.gitignore`
- **Восстановление**: `rm -rf node_modules && npm install`
- **ОС-специфична**: Различается между Windows/Linux/macOS

#### `data/` - База данных (создается автоматически)
```
data/
└── stocktwits.db     # SQLite файл базы данных
```

## 🔧 Логика работы системы

### 1. Инициализация
```
npm start → initializeDatabase() → initializeBrowser() → Express server
```

### 2. Веб-интерфейс
```
http://localhost:3011 → index.ejs → app.js → API calls
```

### 3. Процесс скрейпинга
```
scrapeStockTwits() → Puppeteer → StockTwits.com → HTML parsing → Database
```

### 4. Универсальный алгоритм поиска watchers
```
1. Поиск по специфическим CSS селекторам:
   - .SymbolWatchers_watchers__sp1FU
   - [class*="SymbolWatchers_watchers"]
   - [class*="watchers"]

2. Контекстуальный поиск:
   - Поиск чисел в диапазоне 500-500K
   - Проверка иерархии элементов (5-8 уровней)
   - Поиск ключевых слов: "watcher", "watching", "SymbolInfo"
   - Приоритизация по контексту
```

### 5. Форматы чисел
- `1,234` - стандартный формат с запятыми
- `1234` - простой формат
- `1.2K`, `12K` - сокращенный формат с K
- `1M` - формат с миллионами

### 6. Планировщик задач
```
node-cron → scheduleSymbolScraping() → автоматические проверки каждые 15 минут
```

### 7. Хранение данных
```
SQLite → symbols (настройки) + scraped_data (результаты) + scraping_logs (логи)
```

## 🎯 Текущий статус

- ✅ **Инфраструктура**: Полностью настроена
- ✅ **База данных**: Создана и работает  
- ✅ **Веб-интерфейс**: Готов и функционален
- ✅ **Универсальный алгоритм**: Реализован
- ✅ **Тестовые файлы**: Созданы и проверены
- ⚠️ **Скрейпинг**: Требует отладки (находит 0 кандидатов)
- 🔄 **Сервер**: Работает на порту 3011

## 🚀 Запуск проекта

```bash
cd D:\PromoSites\parser
npm install
npm start
```

Откройте веб-интерфейс: http://localhost:3011

## 📊 Диагностика

Для отладки используйте логи сервера и тестовые файлы:
```bash
node test-clsk.js      # Тест CLSK
node test-generic.js   # Тест универсального алгоритма
node analyze-structure.js  # Анализ HTML структуры
```