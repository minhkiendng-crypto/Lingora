/* =========================================================
   LINGORA - SCRIPT.JS
   BẢN HOÀN CHỈNH
   ========================================================= */

"use strict";

/* =========================================================
   CONFIG
   ========================================================= */

const LINGORA_CONFIG = {
    placementQuestions: 30,
    totalDoors: 11,
    normalDoors: 10,
    partsPerDoor: 180,

    questionsMin: 8,
    questionsMax: 15,

    maxHearts: 5,
    xpPerCorrect: 2,
    hardReviewQuestions: 15
};


/* =========================================================
   DEFAULT STATE
   ========================================================= */

const DEFAULT_STATE = {
    goal: null,
    learningSource: null,

    testScore: 0,
    testLevel: "",

    hearts: 5,
    streak: 0,
    xp: 0,
    level: 1,

    completedLessons: [],
    completedParts: [],
    completedDoors: [],

    mistakes: [],
    vocabulary: [],
    grammar: [],

    lastStudyDate: null,

    currentDoor: 1,
    currentPart: 1,
    currentLesson: 1,

    placementCompleted: false
};


/* =========================================================
   GOALS
   ========================================================= */

const GOALS = {
    communication: {
        name: "Giao tiếp",
        icon: "💬"
    },

    travel: {
        name: "Du lịch",
        icon: "🌍"
    },

    school: {
        name: "Trường học",
        icon: "🏫"
    },

    work: {
        name: "Công việc",
        icon: "💼"
    },

    entertainment: {
        name: "Giải trí",
        icon: "🎬"
    },

    study: {
        name: "Học tập",
        icon: "📚"
    }
};


/* =========================================================
   DOORS
   ========================================================= */

const DOORS = [
    {
        id: 1,
        title: "Cơ bản",
        icon: "🌱",
        description: "Những câu tiếng Anh đầu tiên"
    },

    {
        id: 2,
        title: "Giao tiếp",
        icon: "💬",
        description: "Giao tiếp hằng ngày"
    },

    {
        id: 3,
        title: "Cuộc sống",
        icon: "🏠",
        description: "Gia đình và cuộc sống"
    },

    {
        id: 4,
        title: "Du lịch",
        icon: "🌍",
        description: "Tiếng Anh khi đi du lịch"
    },

    {
        id: 5,
        title: "Trường học",
        icon: "🏫",
        description: "Học tập và trường lớp"
    },

    {
        id: 6,
        title: "Công việc",
        icon: "💼",
        description: "Tiếng Anh nơi làm việc"
    },

    {
        id: 7,
        title: "Xã hội",
        icon: "👥",
        description: "Giao tiếp xã hội"
    },

    {
        id: 8,
        title: "Tự nhiên",
        icon: "🌳",
        description: "Thế giới xung quanh"
    },

    {
        id: 9,
        title: "Nâng cao",
        icon: "🔥",
        description: "Câu tiếng Anh khó hơn"
    },

    {
        id: 10,
        title: "Thành thạo",
        icon: "🏆",
        description: "Luyện tập tổng hợp"
    },

    {
        id: 11,
        title: "Vô hạn",
        icon: "♾️",
        description: "AI luyện tập không giới hạn"
    }
];


/* =========================================================
   LESSON TOPICS
   ========================================================= */

const LESSON_TOPICS = [
    "Chào hỏi",
    "Tạm biệt",
    "Giới thiệu bản thân",
    "Hỏi tên",
    "Quê quán",
    "Tuổi",
    "Gia đình",
    "Sức khỏe",
    "Bạn bè",
    "Sở thích",
    "Thời gian",
    "Ngày tháng",
    "Màu sắc",
    "Số đếm",
    "Đồ ăn",
    "Đồ uống",
    "Nhà cửa",
    "Trường học",
    "Công việc",
    "Mua sắm",
    "Thời tiết",
    "Giao thông",
    "Du lịch",
    "Khách sạn",
    "Nhà hàng",
    "Phương hướng",
    "Cảm xúc",
    "Thì hiện tại",
    "Thì quá khứ",
    "Thì tương lai"
];


/* =========================================================
   STATE
   ========================================================= */

let state = loadState();

let placementQuestions = [];
let placementIndex = 0;
let placementScore = 0;
let placementAnswered = false;

let currentLessonData = null;
let currentQuestionIndex = 0;
let currentLessonScore = 0;
let currentAnswered = false;

let hardReviewData = [];
let hardReviewIndex = 0;
let hardReviewScore = 0;
let hardReviewAnswered = false;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent = value;
    }
}


function showElement(id) {
    const element = $(id);

    if (element) {
        element.classList.remove("hidden");
    }
}


function hideElement(id) {
    const element = $(id);

    if (element) {
        element.classList.add("hidden");
    }
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadState() {
    try {
        const saved = localStorage.getItem("lingora_state");

        if (!saved) {
            return { ...DEFAULT_STATE };
        }

        const parsed = JSON.parse(saved);

        return {
            ...DEFAULT_STATE,
            ...parsed
        };

    } catch (error) {
        console.error("Không thể đọc state:", error);

        return {
            ...DEFAULT_STATE
        };
    }
}


function saveState() {
    try {
        localStorage.setItem(
            "lingora_state",
            JSON.stringify(state)
        );
    } catch (error) {
        console.error("Không thể lưu state:", error);
    }
}


/* =========================================================
   RESET
   ========================================================= */

function resetState() {
    state = {
        ...DEFAULT_STATE
    };

    saveState();
    updateUI();
}


/* =========================================================
   SCREEN
   ========================================================= */

function showScreen(screenId) {

    document.querySelectorAll(".screen").forEach(function(screen) {
        screen.classList.remove("active");
    });

    const target = $(screenId);

    if (target) {
        target.classList.add("active");
    }

    window.scrollTo(0, 0);
}


/* =========================================================
   START APP
   ========================================================= */

function startApp() {

    console.log("Lingora: bắt đầu");

    if (state.placementCompleted) {
        showScreen("homeScreen");

        renderDoors();
        updateUI();

        return;
    }

    showScreen("goalScreen");

    updateUI();
}


/* =========================================================
   GOAL
   ========================================================= */

function getGoalName(goal) {

    if (!GOALS[goal]) {
        return "";
    }

    return GOALS[goal].name;
}


function selectGoal(goal) {

    if (!GOALS[goal]) {
        console.error("Mục tiêu không tồn tại:", goal);
        return;
    }

    state.goal = goal;

    saveState();

    document.querySelectorAll(".goal-card").forEach(function(card) {
        card.classList.remove("selected");
    });

    const selectedCard = document.querySelector(
        '.goal-card[data-goal="' + goal + '"]'
    );

    if (selectedCard) {
        selectedCard.classList.add("selected");
    }

    setText(
        "goalText",
        GOALS[goal].icon + " " + GOALS[goal].name
    );

    const continueButton = $("goalContinue");

    if (continueButton) {
        continueButton.disabled = false;
        continueButton.removeAttribute("disabled");
    }

    console.log("Đã chọn:", goal);
}


function goToInfo() {

    if (!state.goal) {
        alert("Hãy chọn mục tiêu học trước nhé!");
        return;
    }

    showScreen("infoScreen");
}


/* =========================================================
   CHOOSE LEVEL
   ========================================================= */

function chooseInfo(source) {

    state.learningSource = source;

    saveState();

    startPlacementTest();
}


/* =========================================================
   PLACEMENT QUESTION BANK
   ========================================================= */

const PLACEMENT_BANK = [

    {
        id: 1,
        question: "Hello! What is your name?",
        answers: [
            "My name is Nam.",
            "I am fine.",
            "I am 12 years old.",
            "Good night."
        ],
        correct: 0,
        explanation: "Câu hỏi hỏi tên nên câu trả lời phù hợp là 'My name is Nam.'",
        difficulty: "very-easy",
        topic: "Giới thiệu"
    },

    {
        id: 2,
        question: "How are you?",
        answers: [
            "I'm fine, thank you.",
            "I'm twelve.",
            "I'm from Vietnam.",
            "My name is Lan."
        ],
        correct: 0,
        explanation: "'How are you?' hỏi tình trạng/sức khỏe.",
        difficulty: "very-easy",
        topic: "Giao tiếp"
    },

    {
        id: 3,
        question: "Where are you from?",
        answers: [
            "I'm from Vietnam.",
            "I'm thirteen.",
            "I'm fine.",
            "I'm a student."
        ],
        correct: 0,
        explanation: "'Where are you from?' hỏi bạn đến từ đâu.",
        difficulty: "very-easy",
        topic: "Quê quán"
    },

    {
        id: 4,
        question: "How old are you?",
        answers: [
            "I'm thirteen.",
            "I'm from Vietnam.",
            "I'm fine.",
            "My name is Minh."
        ],
        correct: 0,
        explanation: "'How old are you?' hỏi tuổi.",
        difficulty: "very-easy",
        topic: "Tuổi"
    },

    {
        id: 5,
        question: "Choose the correct sentence.",
        answers: [
            "She is my friend.",
            "She are my friend.",
            "She am my friend.",
            "She be my friend."
        ],
        correct: 0,
        explanation: "Với 'she', động từ to be ở hiện tại là 'is'.",
        difficulty: "easy",
        topic: "To be"
    },

    {
        id: 6,
        question: "I ___ a student.",
        answers: [
            "am",
            "is",
            "are",
            "be"
        ],
        correct: 0,
        explanation: "Với chủ ngữ 'I', dùng 'am'.",
        difficulty: "easy",
        topic: "To be"
    },

    {
        id: 7,
        question: "They ___ my friends.",
        answers: [
            "are",
            "is",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "Với 'they', dùng 'are'.",
        difficulty: "easy",
        topic: "To be"
    },

    {
        id: 8,
        question: "What time do you get up?",
        answers: [
            "At seven o'clock.",
            "On Monday.",
            "In the kitchen.",
            "Because I'm tired."
        ],
        correct: 0,
        explanation: "Câu hỏi hỏi thời gian nên dùng 'At seven o'clock.'",
        difficulty: "easy",
        topic: "Thời gian"
    },

    {
        id: 9,
        question: "I usually ___ breakfast at 7 a.m.",
        answers: [
            "have",
            "has",
            "having",
            "had"
        ],
        correct: 0,
        explanation: "Với 'I' ở hiện tại đơn, dùng động từ nguyên mẫu 'have'.",
        difficulty: "easy",
        topic: "Hiện tại đơn"
    },

    {
        id: 10,
        question: "She ___ to school every day.",
        answers: [
            "goes",
            "go",
            "going",
            "gone"
        ],
        correct: 0,
        explanation: "Với 'she' ở hiện tại đơn, động từ 'go' thêm -es thành 'goes'.",
        difficulty: "medium",
        topic: "Hiện tại đơn"
    },

    {
        id: 11,
        question: "There ___ a book on the table.",
        answers: [
            "is",
            "are",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "Có một quyển sách nên dùng 'There is'.",
        difficulty: "medium",
        topic: "There is"
    },

    {
        id: 12,
        question: "There ___ three apples in the basket.",
        answers: [
            "are",
            "is",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "'Three apples' là số nhiều nên dùng 'There are'.",
        difficulty: "medium",
        topic: "There are"
    },

    {
        id: 13,
        question: "I ___ TV yesterday.",
        answers: [
            "watched",
            "watch",
            "watching",
            "watches"
        ],
        correct: 0,
        explanation: "'Yesterday' cho biết hành động xảy ra trong quá khứ.",
        difficulty: "medium",
        topic: "Quá khứ đơn"
    },

    {
        id: 14,
        question: "She is ___ than her brother.",
        answers: [
            "taller",
            "tall",
            "tallest",
            "more tall"
        ],
        correct: 0,
        explanation: "So sánh hơn với tính từ ngắn 'tall' dùng 'taller'.",
        difficulty: "medium",
        topic: "So sánh"
    },

    {
        id: 15,
        question: "I have lived here ___ 2020.",
        answers: [
            "since",
            "for",
            "at",
            "on"
        ],
        correct: 0,
        explanation: "'Since' đi với một mốc thời gian như 2020.",
        difficulty: "hard",
        topic: "Hiện tại hoàn thành"
    },

    {
        id: 16,
        question: "If it rains, we ___ at home.",
        answers: [
            "will stay",
            "stayed",
            "staying",
            "have stayed"
        ],
        correct: 0,
        explanation: "Câu điều kiện loại 1: If + hiện tại đơn, mệnh đề chính dùng will + V.",
        difficulty: "hard",
        topic: "Điều kiện"
    },

    {
        id: 17,
        question: "He has ___ his homework.",
        answers: [
            "finished",
            "finish",
            "finishing",
            "finishes"
        ],
        correct: 0,
        explanation: "Sau 'has' trong hiện tại hoàn thành dùng quá khứ phân từ.",
        difficulty: "hard",
        topic: "Hiện tại hoàn thành"
    },

    {
        id: 18,
        question: "I was tired because I ___ all day.",
        answers: [
            "had worked",
            "work",
            "am working",
            "will work"
        ],
        correct: 0,
        explanation: "Hành động xảy ra trước một thời điểm trong quá khứ có thể dùng quá khứ hoàn thành.",
        difficulty: "hard",
        topic: "Quá khứ hoàn thành"
    },

    {
        id: 19,
        question: "Would you like some coffee?",
        answers: [
            "Yes, please.",
            "Yes, I am.",
            "Yes, I do.",
            "Yes, I was."
        ],
        correct: 0,
        explanation: "Đây là lời mời, câu trả lời tự nhiên là 'Yes, please.'",
        difficulty: "medium",
        topic: "Giao tiếp"
    },

    {
        id: 20,
        question: "Could you help me?",
        answers: [
            "Sure.",
            "I'm twelve.",
            "It's Monday.",
            "I'm from Vietnam."
        ],
        correct: 0,
        explanation: "'Could you help me?' là lời nhờ giúp đỡ.",
        difficulty: "medium",
        topic: "Giao tiếp"
    },

    {
        id: 21,
        question: "How much is this shirt?",
        answers: [
            "It's $20.",
            "It's blue.",
            "It's mine.",
            "It's large."
        ],
        correct: 0,
        explanation: "'How much' hỏi giá tiền.",
        difficulty: "medium",
        topic: "Mua sắm"
    },

    {
        id: 22,
        question: "Where is the nearest hotel?",
        answers: [
            "It's next to the bank.",
            "It's very expensive.",
            "It's delicious.",
            "It's Tuesday."
        ],
        correct: 0,
        explanation: "Câu hỏi hỏi vị trí nên câu trả lời phải chỉ vị trí.",
        difficulty: "medium",
        topic: "Du lịch"
    },

    {
        id: 23,
        question: "I am going to ___ my grandmother tomorrow.",
        answers: [
            "visit",
            "visited",
            "visiting",
            "visits"
        ],
        correct: 0,
        explanation: "Sau 'going to' dùng động từ nguyên mẫu.",
        difficulty: "medium",
        topic: "Tương lai"
    },

    {
        id: 24,
        question: "She can ___ English very well.",
        answers: [
            "speak",
            "speaks",
            "speaking",
            "spoke"
        ],
        correct: 0,
        explanation: "Sau động từ khuyết thiếu 'can' dùng động từ nguyên mẫu.",
        difficulty: "medium",
        topic: "Modal verbs"
    },

    {
        id: 25,
        question: "This is the book ___ I bought yesterday.",
        answers: [
            "that",
            "where",
            "when",
            "who"
        ],
        correct: 0,
        explanation: "'That' có thể thay cho vật trong mệnh đề quan hệ.",
        difficulty: "hard",
        topic: "Mệnh đề quan hệ"
    },

    {
        id: 26,
        question: "If I ___ more time, I would learn another language.",
        answers: [
            "had",
            "have",
            "will have",
            "having"
        ],
        correct: 0,
        explanation: "Điều kiện loại 2 dùng If + quá khứ đơn.",
        difficulty: "hard",
        topic: "Điều kiện"
    },

    {
        id: 27,
        question: "The movie was ___ interesting that I watched it twice.",
        answers: [
            "so",
            "such",
            "too",
            "very"
        ],
        correct: 0,
        explanation: "Cấu trúc 'so + adjective + that'.",
        difficulty: "hard",
        topic: "Cấu trúc câu"
    },

    {
        id: 28,
        question: "By next year, I ___ English for five years.",
        answers: [
            "will have studied",
            "study",
            "studied",
            "am studying"
        ],
        correct: 0,
        explanation: "Hành động kéo dài đến một thời điểm trong tương lai dùng tương lai hoàn thành.",
        difficulty: "hard",
        topic: "Tương lai hoàn thành"
    },

    {
        id: 29,
        question: "She asked me where I ___.",
        answers: [
            "lived",
            "live",
            "am living",
            "will live"
        ],
        correct: 0,
        explanation: "Trong câu tường thuật với động từ quá khứ, thường lùi thì.",
        difficulty: "hard",
        topic: "Câu tường thuật"
    },

    {
        id: 30,
        question: "Neither Tom nor his friends ___ ready.",
        answers: [
            "are",
            "is",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "Với 'Neither...nor', động từ thường hòa hợp với chủ ngữ gần nó: 'his friends' → are.",
        difficulty: "hard",
        topic: "Ngữ pháp"
    }

];


/* =========================================================
   SHUFFLE
   ========================================================= */

function shuffle(array) {

    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        const temp = result[i];

        result[i] = result[j];
        result[j] = temp;
    }

    return result;
}


/* =========================================================
   SHUFFLE ANSWERS
   ========================================================= */

function shuffleQuestionAnswers(question) {

    const answerObjects = question.answers.map(function(answer, index) {
        return {
            text: answer,
            originalIndex: index
        };
    });

    const shuffled = shuffle(answerObjects);

    return {
        ...question,

        answers: shuffled.map(function(item) {
            return item.text;
        }),

        correct: shuffled.findIndex(function(item) {
            return item.originalIndex === question.correct;
        })
    };
}


/* =========================================================
   PLACEMENT TEST
   ========================================================= */

function startPlacementTest() {

    placementQuestions = shuffle(
        PLACEMENT_BANK
    ).slice(
        0,
        LINGORA_CONFIG.placementQuestions
    );

    placementIndex = 0;
    placementScore = 0;
    placementAnswered = false;

    state.testScore = 0;
    state.testLevel = "";

    saveState();

    showScreen("testScreen");

    renderPlacementQuestion();
}


function createPlacementTest() {
    startPlacementTest();
}


function renderPlacementQuestion() {

    if (!placementQuestions.length) {
        return;
    }

    const originalQuestion =
        placementQuestions[placementIndex];

    const question =
        shuffleQuestionAnswers(originalQuestion);

    placementQuestions[placementIndex] = question;

    placementAnswered = false;

    setText(
        "testQuestionNumber",
        placementIndex + 1
    );

    setText(
        "testQuestion",
        question.question
    );

    setText(
        "testTopic",
        question.topic
    );

    const progress =
        ((placementIndex) /
            placementQuestions.length) * 100;

    const progressBar = $("testProgress");

    if (progressBar) {
        progressBar.style.width =
            progress + "%";
    }

    const answersContainer =
        $("testAnswers");

    if (!answersContainer) {
        return;
    }

    answersContainer.innerHTML = "";

    question.answers.forEach(function(answer, index) {

        const button =
            document.createElement("button");

        button.className = "answer-option";

        button.textContent =
            answer;

        button.addEventListener(
            "click",
            function() {
                answerPlacement(index);
            }
        );

        answersContainer.appendChild(button);
    });

    hideElement("testExplanation");

    const nextButton =
        $("testNextButton");

    if (nextButton) {
        nextButton.disabled = true;
        nextButton.textContent =
            placementIndex ===
            placementQuestions.length - 1
                ? "Xem kết quả"
                : "Tiếp tục →";
    }
}


function answerPlacement(index) {

    if (placementAnswered) {
        return;
    }

    placementAnswered = true;

    const question =
        placementQuestions[placementIndex];

    const buttons =
        document.querySelectorAll(
            "#testAnswers .answer-option"
        );

    buttons.forEach(function(button, buttonIndex) {

        button.disabled = true;

        if (buttonIndex === question.correct) {
            button.classList.add("correct");
        }

        if (
            buttonIndex === index &&
            index !== question.correct
        ) {
            button.classList.add("wrong");
        }
    });

    if (index === question.correct) {

        placementScore++;

    } else {

        showExplanation(
            "testExplanation",
            question.explanation
        );
    }

    const nextButton =
        $("testNextButton");

    if (nextButton) {
        nextButton.disabled = false;
    }
}


function nextPlacementQuestion() {

    if (!placementAnswered) {
        return;
    }

    placementIndex++;

    if (
        placementIndex >=
        placementQuestions.length
    ) {

        finishPlacementTest();

        return;
    }

    renderPlacementQuestion();
}


function finishPlacementTest() {

    const total =
        placementQuestions.length || 30;

    const percentage =
        (placementScore / total) * 100;

    let level = "";

    if (percentage < 30) {
        level = "🌱 Mới bắt đầu";
    } else if (percentage < 50) {
        level = "🌿 Cơ bản";
    } else if (percentage < 70) {
        level = "🌳 Khá";
    } else if (percentage < 85) {
        level = "🔥 Tốt";
    } else {
        level = "🏆 Nâng cao";
    }

    state.testScore = placementScore;
    state.testLevel = level;
    state.placementCompleted = true;

    saveState();

    setText(
        "testScore",
        placementScore
    );

    setText(
        "testLevel",
        level
    );

    setText(
        "testMessage",
        "Lingora đã phân tích kết quả và sẵn sàng đưa bạn vào cây học tập."
    );

    showScreen("resultScreen");
}


function finishTest() {

    showScreen("homeScreen");

    renderDoors();
    updateUI();
}


/* =========================================================
   LESSON QUESTION BANK
   ========================================================= */

const QUESTION_BANK = [

    {
        id: 101,
        question: "How do you say 'Xin chào' in English?",
        answers: [
            "Hello",
            "Goodbye",
            "Thanks",
            "Sorry"
        ],
        correct: 0,
        explanation: "'Hello' nghĩa là 'Xin chào'.",
        topic: "Chào hỏi"
    },

    {
        id: 102,
        question: "How do you say 'Tạm biệt'?",
        answers: [
            "Goodbye",
            "Hello",
            "Please",
            "Welcome"
        ],
        correct: 0,
        explanation: "'Goodbye' nghĩa là 'Tạm biệt'.",
        topic: "Tạm biệt"
    },

    {
        id: 103,
        question: "What is your name?",
        answers: [
            "My name is Minh.",
            "I'm fine.",
            "I'm twelve.",
            "I'm from Vietnam."
        ],
        correct: 0,
        explanation: "Câu hỏi 'What is your name?' hỏi tên.",
        topic: "Giới thiệu"
    },

    {
        id: 104,
        question: "Nice to meet you.",
        answers: [
            "Nice to meet you, too.",
            "I'm twelve.",
            "Good night.",
            "I'm hungry."
        ],
        correct: 0,
        explanation: "Câu đáp tự nhiên là 'Nice to meet you, too.'",
        topic: "Giao tiếp"
    },

    {
        id: 105,
        question: "Where are you from?",
        answers: [
            "I'm from Vietnam.",
            "I'm fine.",
            "I'm twelve.",
            "I'm a student."
        ],
        correct: 0,
        explanation: "Dùng 'I'm from...' để nói mình đến từ đâu.",
        topic: "Quê quán"
    },

    {
        id: 106,
        question: "How old are you?",
        answers: [
            "I'm twelve years old.",
            "I'm from Vietnam.",
            "I'm fine.",
            "My name is Nam."
        ],
        correct: 0,
        explanation: "Dùng 'I'm ... years old' để nói tuổi.",
        topic: "Tuổi"
    },

    {
        id: 107,
        question: "How are you?",
        answers: [
            "I'm fine, thank you.",
            "I'm twelve.",
            "I'm from Vietnam.",
            "My name is Lan."
        ],
        correct: 0,
        explanation: "'How are you?' hỏi tình trạng/sức khỏe.",
        topic: "Sức khỏe"
    },

    {
        id: 108,
        question: "I ___ a student.",
        answers: [
            "am",
            "is",
            "are",
            "be"
        ],
        correct: 0,
        explanation: "Với 'I', dùng 'am'.",
        topic: "Ngữ pháp"
    },

    {
        id: 109,
        question: "She ___ my friend.",
        answers: [
            "is",
            "are",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "Với 'she', dùng 'is'.",
        topic: "Ngữ pháp"
    },

    {
        id: 110,
        question: "They ___ happy.",
        answers: [
            "are",
            "is",
            "am",
            "be"
        ],
        correct: 0,
        explanation: "Với 'they', dùng 'are'.",
        topic: "Ngữ pháp"
    },

    {
        id: 111,
        question: "I usually ___ breakfast at 7.",
        answers: [
            "have",
            "has",
            "having",
            "had"
        ],
        correct: 0,
        explanation: "Với 'I' ở hiện tại đơn dùng 'have'.",
        topic: "Hiện tại đơn"
    },

    {
        id: 112,
        question: "She ___ to school every day.",
        answers: [
            "goes",
            "go",
            "going",
            "gone"
        ],
        correct: 0,
        explanation: "Với 'she', 'go' thành 'goes'.",
        topic: "Hiện tại đơn"
    },

    {
        id: 113,
        question: "I ___ TV yesterday.",
        answers: [
            "watched",
            "watch",
            "watching",
            "watches"
        ],
        correct: 0,
        explanation: "'Yesterday' cho biết hành động trong quá khứ.",
        topic: "Quá khứ"
    },

    {
        id: 114,
        question: "I am going to ___ tomorrow.",
        answers: [
            "travel",
            "traveled",
            "travels",
            "traveling"
        ],
        correct: 0,
        explanation: "Sau 'going to' dùng động từ nguyên mẫu.",
        topic: "Tương lai"
    },

    {
        id: 115,
        question: "Can you help me?",
        answers: [
            "Sure.",
            "I'm twelve.",
            "It's Monday.",
            "I'm hungry."
        ],
        correct: 0,
        explanation: "'Sure' là cách đáp tự nhiên khi đồng ý giúp.",
        topic: "Giao tiếp"
    },

    {
        id: 116,
        question: "How much is this?",
        answers: [
            "It's ten dollars.",
            "It's blue.",
            "It's mine.",
            "It's big."
        ],
        correct: 0,
        explanation: "'How much' hỏi giá.",
        topic: "Mua sắm"
    },

    {
        id: 117,
        question: "Where is the bathroom?",
        answers: [
            "It's over there.",
            "I'm hungry.",
            "It's delicious.",
            "I'm twelve."
        ],
        correct: 0,
        explanation: "Câu hỏi hỏi vị trí nên câu trả lời cần chỉ vị trí.",
        topic: "Du lịch"
    },

    {
        id: 118,
        question: "Would you like some water?",
        answers: [
            "Yes, please.",
            "Yes, I am.",
            "Yes, I do.",
            "Yes, I was."
        ],
        correct: 0,
        explanation: "Lời mời thường được đáp bằng 'Yes, please.'",
        topic: "Giao tiếp"
    }
];


/* =========================================================
   GENERATE QUESTIONS
   ========================================================= */

function generateQuestions(
    door = 1,
    part = 1,
    lesson = 1
) {

    let amount =
        Math.floor(
            Math.random() *
            (
                LINGORA_CONFIG.questionsMax -
                LINGORA_CONFIG.questionsMin +
                1
            )
        ) +
        LINGORA_CONFIG.questionsMin;

    amount =
        Math.min(
            amount,
            QUESTION_BANK.length
        );

    const selected =
        shuffle(QUESTION_BANK)
            .slice(0, amount)
            .map(function(question) {
                return shuffleQuestionAnswers(question);
            });

    return selected;
}


/* =========================================================
   START LESSON
   ========================================================= */

function startLesson(
    door = 1,
    part = 1,
    lesson = 1
) {

    currentLessonData = {
        door: door,
        part: part,
        lesson: lesson,
        questions: generateQuestions(
            door,
            part,
            lesson
        )
    };

    currentQuestionIndex = 0;
    currentLessonScore = 0;
    currentAnswered = false;

    state.currentDoor = door;
    state.currentPart = part;
    state.currentLesson = lesson;

    saveState();

    showScreen("lessonScreen");

    renderLessonQuestion();
}


/* =========================================================
   RENDER LESSON
   ========================================================= */

function renderLessonQuestion() {

    if (!currentLessonData) {
        return;
    }

    const total =
        currentLessonData.questions.length;

    if (
        currentQuestionIndex >= total
    ) {
        finishLesson();

        return;
    }

    const question =
        currentLessonData.questions[
            currentQuestionIndex
        ];

    currentAnswered = false;

    setText(
        "currentDoorNumber",
        currentLessonData.door
    );

    setText(
        "currentPartNumber",
        currentLessonData.part
    );

    setText(
        "currentLessonNumber",
        currentLessonData.lesson
    );

    setText(
        "lessonQuestionNumber",
        currentQuestionIndex + 1
    );

    setText(
        "lessonQuestionTotal",
        total
    );

    setText(
        "lessonQuestion",
        question.question
    );

    setText(
        "lessonType",
        question.topic || "Luyện tập"
    );

    const progress =
        ((currentQuestionIndex) /
            total) * 100;

    const progressBar =
        $("lessonProgress");

    if (progressBar) {
        progressBar.style.width =
            progress + "%";
    }

    const answers =
        $("lessonAnswers");

    if (!answers) {
        return;
    }

    answers.innerHTML = "";

    question.answers.forEach(
        function(answer, index) {

            const button =
                document.createElement("button");

            button.className =
                "answer-option";

            button.textContent =
                answer;

            button.addEventListener(
                "click",
                function() {
                    answerLesson(index);
                }
            );

            answers.appendChild(button);
        }
    );

    hideElement("lessonExplanation");

    const feedback =
        $("lessonFeedback");

    if (feedback) {
        feedback.className =
            "feedback hidden";

        feedback.textContent = "";
    }

    const nextButton =
        $("lessonNextButton");

    if (nextButton) {
        nextButton.disabled = true;
        nextButton.textContent =
            "Kiểm tra";
    }

    setText(
        "lessonHearts",
        state.hearts
    );
}


/* =========================================================
   ANSWER LESSON
   ========================================================= */

function answerLesson(index) {

    if (currentAnswered) {
        return;
    }

    if (!currentLessonData) {
        return;
    }

    currentAnswered = true;

    const question =
        currentLessonData.questions[
            currentQuestionIndex
        ];

    const buttons =
        document.querySelectorAll(
            "#lessonAnswers .answer-option"
        );

    buttons.forEach(
        function(button, buttonIndex) {

            button.disabled = true;

            if (
                buttonIndex ===
                question.correct
            ) {
                button.classList.add(
                    "correct"
                );
            }

            if (
                buttonIndex === index &&
                index !== question.correct
            ) {
                button.classList.add(
                    "wrong"
                );
            }
        }
    );

    if (
        index === question.correct
    ) {

        currentLessonScore++;

        state.xp +=
            LINGORA_CONFIG.xpPerCorrect;

        showFeedback(
            "lessonFeedback",
            "✅ Chính xác!"
        );

    } else {

        state.hearts =
            Math.max(
                0,
                state.hearts - 1
            );

        saveMistake(question);

        showFeedback(
            "lessonFeedback",
            "❌ Chưa đúng. Xem giải thích nhé!"
        );

        showExplanation(
            "lessonExplanation",
            question.explanation
        );
    }

    saveState();

    updateUI();

    setText(
        "lessonHearts",
        state.hearts
    );

    const nextButton =
        $("lessonNextButton");

    if (nextButton) {
        nextButton.disabled = false;

        nextButton.textContent =
            currentQuestionIndex ===
            currentLessonData.questions.length - 1
                ? "Hoàn thành"
                : "Tiếp tục →";
    }
}


/* =========================================================
   NEXT LESSON QUESTION
   ========================================================= */

function nextLessonQuestion() {

    if (!currentAnswered) {
        return;
    }

    currentQuestionIndex++;

    if (
        currentLessonData &&
        currentQuestionIndex >=
        currentLessonData.questions.length
    ) {

        finishLesson();

        return;
    }

    renderLessonQuestion();
}


/* =========================================================
   FINISH LESSON
   ========================================================= */

function finishLesson() {

    if (!currentLessonData) {
        return;
    }

    const lessonKey =
        currentLessonData.door +
        "-" +
        currentLessonData.part +
        "-" +
        currentLessonData.lesson;

    if (
        !state.completedLessons.includes(
            lessonKey
        )
    ) {

        state.completedLessons.push(
            lessonKey
        );
    }

    const partKey =
        currentLessonData.door +
        "-" +
        currentLessonData.part;

    if (
        !state.completedParts.includes(
            partKey
        )
    ) {

        state.completedParts.push(
            partKey
        );
    }

    const doorKey =
        String(
            currentLessonData.door
        );

    if (
        !state.completedDoors.includes(
            doorKey
        ) &&
        currentLessonData.lesson >= 180
    ) {

        state.completedDoors.push(
            doorKey
        );
    }

    setText(
        "completedDoorNumber",
        currentLessonData.door
    );

    setText(
        "completedPartNumber",
        currentLessonData.part
    );

    setText(
        "completedLessonNumber",
        currentLessonData.lesson
    );

    setText(
        "lessonXpEarned",
        currentLessonScore *
        LINGORA_CONFIG.xpPerCorrect
    );

    setText(
        "lessonScore",
        currentLessonScore +
        "/" +
        currentLessonData.questions.length
    );

    updateStreak();

    saveState();

    showScreen(
        "lessonCompleteScreen"
    );

    updateUI();
}


/* =========================================================
   EXIT LESSON
   ========================================================= */

function exitLesson() {

    currentLessonData = null;
    currentQuestionIndex = 0;
    currentLessonScore = 0;
    currentAnswered = false;

    goHome();
}


/* =========================================================
   FEEDBACK
   ========================================================= */

function showFeedback(id, message) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.textContent = message;
    element.classList.remove("hidden");
}


function showExplanation(id, message) {

    const element = $(id);

    if (!element) {
        return;
    }

    element.innerHTML =
        "<strong>💡 Tại sao?</strong><br>" +
        message;

    element.classList.remove(
        "hidden"
    );
}


/* =========================================================
   MISTAKES
   ========================================================= */

function saveMistake(question) {

    const exists =
        state.mistakes.some(
            function(item) {
                return item.id === question.id;
            }
        );

    if (!exists) {

        state.mistakes.push({
            id: question.id,
            question: question.question,
            explanation: question.explanation
        });
    }
}


/* =========================================================
   HARD REVIEW
   ========================================================= */

function startHardReview() {

    hardReviewData =
        shuffle(
            QUESTION_BANK
        )
        .slice(
            0,
            LINGORA_CONFIG.hardReviewQuestions
        )
        .map(function(question) {
            return shuffleQuestionAnswers(question);
        });

    hardReviewIndex = 0;
    hardReviewScore = 0;
    hardReviewAnswered = false;

    showScreen("lessonScreen");

    renderHardReviewQuestion();
}


function renderHardReviewQuestion() {

    if (
        hardReviewIndex >=
        hardReviewData.length
    ) {

        finishHardReview();

        return;
    }

    const question =
        hardReviewData[
            hardReviewIndex
        ];

    hardReviewAnswered = false;

    setText(
        "currentDoorNumber",
        "🔥"
    );

    setText(
        "currentPartNumber",
        "Ôn"
    );

    setText(
        "currentLessonNumber",
        "Tập"
    );

    setText(
        "lessonQuestionNumber",
        hardReviewIndex + 1
    );

    setText(
        "lessonQuestionTotal",
        hardReviewData.length
    );

    setText(
        "lessonQuestion",
        question.question
    );

    setText(
        "lessonType",
        "Ôn tập khó"
    );

    const progressBar =
        $("lessonProgress");

    if (progressBar) {

        progressBar.style.width =
            (
                hardReviewIndex /
                hardReviewData.length *
                100
            ) + "%";
    }

    const answers =
        $("lessonAnswers");

    if (!answers) {
        return;
    }

    answers.innerHTML = "";

    question.answers.forEach(
        function(answer, index) {

            const button =
                document.createElement("button");

            button.className =
                "answer-option";

            button.textContent =
                answer;

            button.addEventListener(
                "click",
                function() {
                    answerHardReview(index);
                }
            );

            answers.appendChild(button);
        }
    );

    hideElement("lessonExplanation");

    const nextButton =
        $("lessonNextButton");

    if (nextButton) {
        nextButton.disabled = true;
        nextButton.textContent =
            "Kiểm tra";
    }

    setText(
        "lessonHearts",
        state.hearts
    );
}


function answerHardReview(index) {

    if (hardReviewAnswered) {
        return;
    }

    hardReviewAnswered = true;

    const question =
        hardReviewData[
            hardReviewIndex
        ];

    const buttons =
        document.querySelectorAll(
            "#lessonAnswers .answer-option"
        );

    buttons.forEach(
        function(button, buttonIndex) {

            button.disabled = true;

            if (
                buttonIndex ===
                question.correct
            ) {
                button.classList.add(
                    "correct"
                );
            }

            if (
                buttonIndex === index &&
                index !== question.correct
            ) {
                button.classList.add(
                    "wrong"
                );
            }
        }
    );

    if (
        index === question.correct
    ) {

        hardReviewScore++;

        showFeedback(
            "lessonFeedback",
            "✅ Chính xác!"
        );

    } else {

        showFeedback(
            "lessonFeedback",
            "❌ Chưa đúng!"
        );

        showExplanation(
            "lessonExplanation",
            question.explanation
        );
    }

    const nextButton =
        $("lessonNextButton");

    if (nextButton) {
        nextButton.disabled = false;

        nextButton.textContent =
            hardReviewIndex ===
            hardReviewData.length - 1
                ? "Xem kết quả"
                : "Tiếp tục →";
    }
}


function nextHardReviewQuestion() {

    if (!hardReviewAnswered) {
        return;
    }

    hardReviewIndex++;

    if (
        hardReviewIndex >=
        hardReviewData.length
    ) {

        finishHardReview();

        return;
    }

    renderHardReviewQuestion();
}


function finishHardReview() {

    const wasZero =
        state.hearts === 0;

    if (
        wasZero &&
        hardReviewScore >= 8
    ) {

        state.hearts =
            Math.min(
                LINGORA_CONFIG.maxHearts,
                state.hearts + 1
            );
    }

    state.xp +=
        hardReviewScore *
        LINGORA_CONFIG.xpPerCorrect;

    saveState();

    alert(
        "🔥 Ôn tập hoàn thành!\n" +
        "Đúng: " +
        hardReviewScore +
        "/" +
        hardReviewData.length +
        "\n❤️ Tim hiện tại: " +
        state.hearts
    );

    goHome();
}


/* =========================================================
   REVIEW
   ========================================================= */

function showReview() {
    showScreen("reviewScreen");
}


function startReview(type) {

    if (
        type === "mistakes" &&
        state.mistakes.length > 0
    ) {

        const mistakeQuestions =
            state.mistakes.map(
                function(item) {

                    return {
                        id: item.id,
                        question: item.question,
                        answers: [
                            "Đáp án A",
                            "Đáp án B",
                            "Đáp án C",
                            "Đáp án D"
                        ],
                        correct: 0,
                        explanation:
                            item.explanation,
                        topic: "Lỗi sai"
                    };
                }
            );

        currentLessonData = {
            door: 0,
            part: "Ôn",
            lesson: "Lỗi",
            questions:
                mistakeQuestions.map(
                    function(question) {
                        return shuffleQuestionAnswers(
                            question
                        );
                    }
                )
        };

        currentQuestionIndex = 0;
        currentLessonScore = 0;
        currentAnswered = false;

        showScreen("lessonScreen");

        renderLessonQuestion();

        return;
    }

    if (type === "vocabulary") {

        alert(
            "📚 Bạn chưa có nhiều từ vựng cần ôn. Hãy học thêm bài mới nhé!"
        );

        return;
    }

    showReview();
}


/* =========================================================
   INFINITE PRACTICE
   ========================================================= */

function startInfinitePractice() {

    currentLessonData = {
        door: 11,
        part: "∞",
        lesson: "∞",
        questions: generateQuestions(
            11,
            0,
            0
        )
    };

    currentQuestionIndex = 0;
    currentLessonScore = 0;
    currentAnswered = false;

    showScreen("lessonScreen");

    renderLessonQuestion();
}


/* =========================================================
   DOORS
   ========================================================= */

function renderDoors() {

    const container =
        $("doorsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    DOORS.forEach(
        function(door) {

            const completed =
                state.completedDoors.includes(
                    String(door.id)
                );

            const card =
                document.createElement("button");

            card.className =
                "door-card";

            card.innerHTML = `
                <div class="door-icon">
                    ${door.icon}
                </div>

                <div class="door-info">
                    <strong>
                        Cửa ${door.id}: ${door.title}
                    </strong>

                    <small>
                        ${door.description}
                    </small>

                    <span>
                        ${
                            door.id === 11
                                ? "♾️ Vô hạn"
                                : "180 phần • 1.800 câu"
                        }
                    </span>
                </div>

                <div class="door-status">
                    ${
                        completed
                            ? "✅"
                            : "→"
                    }
                </div>
            `;

            card.addEventListener(
                "click",
                function() {
                    openDoor(door.id);
                }
            );

            container.appendChild(card);
        }
    );
}


/* =========================================================
   OPEN DOOR
   ========================================================= */

function openDoor(doorId) {

    if (
        doorId === 11
    ) {

        startInfinitePractice();

        return;
    }

    openPart(
        doorId,
        1
    );
}


/* =========================================================
   OPEN PART
   ========================================================= */

function openPart(
    doorId,
    partId
) {

    state.currentDoor =
        doorId;

    state.currentPart =
        partId;

    saveState();

    const door =
        DOORS.find(
            function(item) {
                return item.id === doorId;
            }
        );

    if (door) {

        setText(
            "partDoorTitle",
            "🚪 Cửa " + door.id
        );

        setText(
            "partTitle",
            "📚 Phần " + partId
        );

        setText(
            "partDescription",
            door.description
        );
    }

    renderParts(
        doorId,
        partId
    );

    showScreen("partScreen");
}


/* =========================================================
   RENDER PARTS
   ========================================================= */

function renderParts(
    doorId,
    currentPart
) {

    const container =
        $("partsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    const start =
        Math.max(
            1,
            currentPart
        );

    const end =
        Math.min(
            180,
            start + 17
        );

    for (
        let part = start;
        part <= end;
        part++
    ) {

        const card =
            document.createElement("button");

        card.className =
            "part-card";

        const completed =
            state.completedParts.includes(
                doorId + "-" + part
            );

        card.innerHTML = `
            <div class="part-number">
                ${
                    completed
                        ? "✅"
                        : "📚"
                }
            </div>

            <div>
                <strong>
                    Phần ${part}
                </strong>

                <small>
                    ${LESSON_TOPICS[
                        (part - 1) %
                        LESSON_TOPICS.length
                    ]}
                </small>

                <span>
                    10 bài học
                </span>
            </div>
        `;

        card.addEventListener(
            "click",
            function() {
                startLesson(
                    doorId,
                    part,
                    1
                );
            }
        );

        container.appendChild(card);
    }
}


/* =========================================================
   HOME
   ========================================================= */

function goHome() {

    showScreen("homeScreen");

    renderDoors();
    updateUI();
}


/* =========================================================
   RANKING
   ========================================================= */

function goRanking() {

    setText(
        "rankingXp",
        state.xp + " XP"
    );

    showScreen("rankingScreen");
}


/* =========================================================
   PROFILE
   ========================================================= */

function goProfile() {

    setText(
        "profileXp",
        state.xp
    );

    setText(
        "profileStreak",
        state.streak
    );

    setText(
        "profileLevel",
        state.level
    );

    const percentage =
        getProgressPercent();

    setText(
        "profileProgress",
        percentage + "%"
    );

    const progressBar =
        $("profileProgressBar");

    if (progressBar) {
        progressBar.style.width =
            percentage + "%";
    }

    showScreen("profileScreen");
}


/* =========================================================
   PROGRESS
   ========================================================= */

function getTotalNormalLessons() {

    return (
        LINGORA_CONFIG.normalDoors *
        LINGORA_CONFIG.partsPerDoor
    );
}


function getProgressPercent() {

    const total =
        getTotalNormalLessons();

    if (total <= 0) {
        return 0;
    }

    const completed =
        state.completedLessons.length;

    return Math.min(
        100,
        Math.round(
            completed /
            total *
            100
        )
    );
}


/* =========================================================
   STREAK
   ========================================================= */

function updateStreak() {

    const today =
        new Date()
            .toISOString()
            .slice(0, 10);

    if (
        state.lastStudyDate === today
    ) {
        return;
    }

    if (!state.lastStudyDate) {

        state.streak = 1;

    } else {

        const previous =
            new Date(
                state.lastStudyDate
            );

        const current =
            new Date(today);

        const difference =
            Math.floor(
                (
                    current -
                    previous
                ) /
                (
                    1000 *
                    60 *
                    60 *
                    24
                )
            );

        if (difference === 1) {

            state.streak++;

        } else {

            state.streak = 1;
        }
    }

    state.lastStudyDate =
        today;
}


/* =========================================================
   UI UPDATE
   ========================================================= */

function updateUI() {

    setText(
        "heartCount",
        state.hearts
    );

    setText(
        "streakCount",
        state.streak
    );

    setText(
        "xpCount",
        state.xp
    );

    setText(
        "lessonHearts",
        state.hearts
    );

    setText(
        "testHearts",
        state.hearts
    );

    setText(
        "profileXp",
        state.xp
    );

    setText(
        "profileStreak",
        state.streak
    );

    setText(
        "profileLevel",
        state.level
    );

    setText(
        "rankingXp",
        state.xp + " XP"
    );

    setText(
        "profileProgress",
        getProgressPercent() + "%"
    );

    if (state.goal) {

        setText(
            "goalText",
            GOALS[state.goal].icon +
            " " +
            GOALS[state.goal].name
        );

        const selected =
            document.querySelector(
                '.goal-card[data-goal="' +
                state.goal +
                '"]'
            );

        if (selected) {
            selected.classList.add(
                "selected"
            );
        }

        const continueButton =
            $("goalContinue");

        if (continueButton) {
            continueButton.disabled =
                false;
        }
    }
}


/* =========================================================
   BUTTON BIND
   ========================================================= */

function bindButtons() {

    const goalContinue =
        $("goalContinue");

    if (goalContinue) {

        goalContinue.addEventListener(
            "click",
            goToInfo
        );
    }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

    const username =
        $("loginUsername")?.value.trim();

    const password =
        $("loginPassword")?.value;

    if (!username || !password) {

        alert(
            "Vui lòng nhập đầy đủ thông tin!"
        );

        return;
    }

    try {

        const response =
            await fetch(
                "/api/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username,
                        password
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status ===
            "success"
        ) {

            alert(
                "Đăng nhập thành công!"
            );

            showScreen(
                "homeScreen"
            );

            renderDoors();
            updateUI();

        } else {

            alert(
                data.message ||
                "Đăng nhập thất bại!"
            );
        }

    } catch (error) {

        console.error(error);

        alert(
            "Không thể kết nối máy chủ."
        );
    }
}


/* =========================================================
   REGISTER
   ========================================================= */

async function register() {

    const username =
        $("registerUsername")?.value.trim();

    const password =
        $("registerPassword")?.value;

    if (!username || !password) {

        alert(
            "Vui lòng nhập đầy đủ thông tin!"
        );

        return;
    }

    try {

        const response =
            await fetch(
                "/api/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        username,
                        password
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status ===
            "success"
        ) {

            alert(
                "Đăng ký thành công!"
            );

            showScreen(
                "loginScreen"
            );

        } else {

            alert(
                data.message ||
                "Đăng ký thất bại!"
            );
        }

    } catch (error) {

        console.error(error);

        alert(
            "Không thể kết nối máy chủ."
        );
    }
}


/* =========================================================
   NEXT BUTTON SUPPORT
   ========================================================= */

function nextLesson() {

    if (
        hardReviewData.length > 0 &&
        hardReviewIndex <
        hardReviewData.length &&
        hardReviewAnswered
    ) {

        nextHardReviewQuestion();

        return;
    }

    nextLessonQuestion();
}


/* =========================================================
   WINDOW EXPORT
   ========================================================= */

window.Lingora = {

    startApp,

    selectGoal,
    goToInfo,
    chooseInfo,

    startPlacementTest,
    createPlacementTest,

    nextPlacementQuestion,
    finishPlacementTest,
    finishTest,

    startLesson,
    answerLesson,
    nextLessonQuestion,
    finishLesson,
    exitLesson,

    startHardReview,
    startReview,
    startInfinitePractice,

    showReview,

    goHome,
    goRanking,
    goProfile,

    openDoor,
    openPart,

    login,
    register,

    resetState
};


/* =========================================================
   INITIALIZE
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "🌳 Lingora đã tải thành công!"
        );

        bindButtons();

        updateUI();

        /*
         * Không tự chuyển màn hình.
         * Màn hình welcome sẽ hiện trước.
         */

        showScreen(
            "welcomeScreen"
        );
    }
);