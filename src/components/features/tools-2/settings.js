import { useState, useEffect } from "react";

import Header from "@/components/layout/Header";
import { addKeyToCookies, addUserToCookies, getKeyFromCookies } from "./actions";
import { v4 as uuidv4 } from "uuid";

import TimeIcon from "@/assets/general/time.svg";
import SettsIcon from "@/assets/general/setts.svg";
import InfoIcon from "@/assets/general/info.svg";
import CourseIcon from "@/assets/nav/course.svg";
import CloseIcon from "@/assets/general/close.svg";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input/Input";

// Функция для проверки токена через API
async function validateTokenAPI(tokenValue) {
    try {
        const response = await fetch(`/api/mayak/validate-token?token=${encodeURIComponent(tokenValue)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        return {
            valid: data.valid || false,
            remainingAttempts: data.remainingAttempts || 0,
            usageLimit: data.usageLimit || 0,
            usedCount: data.usedCount || 0,
            error: data.error || null,
        };
    } catch (error) {
        console.error("Ошибка проверки токена:", error);
        return { valid: false, remainingAttempts: 0, usageLimit: 0, usedCount: 0, error: "Ошибка сервера" };
    }
}

// Функция для использования токена (увеличение счетчика)
async function useTokenAPI(tokenValue) {
    try {
        const response = await fetch("/api/mayak/validate-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: tokenValue }),
        });
        const data = await response.json();
        return {
            success: data.success || false,
            remainingAttempts: data.remainingAttempts || 0,
            error: data.error || null,
        };
    } catch (error) {
        console.error("Ошибка использования токена:", error);
        return { success: false, remainingAttempts: 0, error: "Ошибка сервера" };
    }
}

export default function SettingsPage({ goTo }) {
    // Токен и его валидация
    const [token, setToken] = useState("");
    const [isTokenValid, setIsTokenValid] = useState(false);
    const [tokenExists, setTokenExists] = useState(false); // Новое состояние
    const [showNotification, setShowNotification] = useState(false);
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [adminPassword, setAdminPassword] = useState("");
    const [adminLoginError, setAdminLoginError] = useState("");

    // Данные пользователя
    const [userData, setUserData] = useState({
        lastName: "",
        firstName: "",
        college: "",
    });

    const [isLoading, setIsLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Токен usage - теперь динамические значения
    const [max, setMax] = useState(180);
    const [value, setValue] = useState(0);

    // Получаем токен из cookies при монтировании компонента

    async function getRecordsCount() {
        try {
            const response = await fetch("/api/mayak/count");
            if (!response.ok) {
                throw new Error("Не удалось получить количество записей");
            }
            const data = await response.json();
            console.log(data);
            return data.count; //|| 0
        } catch (error) {
            console.error("Ошибка при получении количества записей:", error);
            return 0;
        }
    }

    // Состояние для отображения оставшихся попыток токена
    const [tokenRemainingAttempts, setTokenRemainingAttempts] = useState(0);
    const [tokenError, setTokenError] = useState("");
    const [isValidating, setIsValidating] = useState(false);

    const getRangeClass = (val) => {
        if (val < 30) return "range-low";
        if (val < 80) return "range-mid";
        return "range-high";
    };

    // Асинхронная функция валидации токена через API
    const validateToken = async (tokenToValidate) => {
        if (!tokenToValidate || tokenToValidate.trim() === "") {
            setIsTokenValid(false);
            setShowNotification(false);
            setTokenError("");
            return;
        }

        setIsValidating(true);
        setTokenError("");

        const result = await validateTokenAPI(tokenToValidate);

        setIsTokenValid(result.valid);
        setTokenRemainingAttempts(result.remainingAttempts);

        // Устанавливаем значения для шкалы на основе данных токена
        if (result.usageLimit > 0) {
            setMax(result.usageLimit);
            setValue(result.remainingAttempts);
        }

        if (result.valid) {
            setShowNotification(true);
            // ВАЖНО: Сразу сохраняем валидный токен в cookies, чтобы он использовался при переходе в тренажер
            await addKeyToCookies(tokenToValidate);
        } else {
            setTokenError(result.error || "Токен недействителен");
            setShowNotification(false);
        }

        setIsValidating(false);
    };

    useEffect(() => {
        async function fetchTokenAndUsage() {
            const KeyInCookies = await getKeyFromCookies();
            if (KeyInCookies && KeyInCookies.text) {
                setToken(KeyInCookies.text);
                setTokenExists(true);
                // Валидируем токен напрямую
                const result = await validateTokenAPI(KeyInCookies.text);
                setIsTokenValid(result.valid);
                setTokenRemainingAttempts(result.remainingAttempts);
                if (result.usageLimit > 0) {
                    setMax(result.usageLimit);
                    setValue(result.remainingAttempts);
                }
                if (result.valid) {
                    setShowNotification(true);
                }
            }
        }
        fetchTokenAndUsage();
    }, []);

    const handleUserDataChange = (e) => {
        const { name, value } = e.target;
        setUserData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const saveData = async () => {
        if (!isTokenValid) {
            alert("Пожалуйста, введите корректный токен для активации тренажера");
            return;
        }

        if (!userData.lastName || !userData.firstName || !userData.college) {
            alert("Пожалуйста, заполните обязательные поля: Фамилия, Имя и Колледж");
            return;
        }

        setIsLoading(true);

        try {
            // Используем токен (увеличиваем счётчик использований)
            const useResult = await useTokenAPI(token);
            if (!useResult.success) {
                alert(useResult.error || "Ошибка при использовании токена");
                setIsLoading(false);
                return;
            }

            const userId = uuidv4();

            const userRecord = {
                id: userId,
                userData,
            };

            const dataToSave = {
                key: token,
                userId,
                data: userRecord,
            };

            const response = await fetch("/api/mayak/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(dataToSave),
            });

            if (response.ok) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                await addKeyToCookies(token);
                await addUserToCookies(userId, userData.lastName + " " + userData.firstName);

                // Обновляем количество использований
                const updatedRecordsCount = await getRecordsCount();

                setValue(max - updatedRecordsCount);

                setUserData({
                    lastName: "",
                    firstName: "",
                    college: "",
                });
            } else {
                throw new Error("Ошибка при сохранении данных");
            }
        } catch (error) {
            console.error("Ошибка:", error);
            alert("Произошла ошибка при сохранении данных");
        } finally {
            setIsLoading(false);
            goTo("trainer");
        }
    };
    const handleAdminLogin = async (e) => {
        e.preventDefault();
        // !!! ВАЖНО: Замените 'mayak-power-2024' на свой надежный пароль !!!
        const CORRECT_ADMIN_PASSWORD = "a12345";

        if (adminPassword === CORRECT_ADMIN_PASSWORD) {
            // Используем специальный админ-токен для обхода проверки
            const ADMIN_BYPASS_TOKEN = "ADMIN-BYPASS-TOKEN";

            await addKeyToCookies(ADMIN_BYPASS_TOKEN);
            await addUserToCookies("admin-id", "Администратор");

            goTo("trainer"); // Переходим в тренажер
        } else {
            setAdminLoginError("Неверный пароль");
            setAdminPassword("");
            setTimeout(() => setAdminLoginError(""), 3000);
        }
    };

    return (
        <>
            <Header>
                <Header.Heading>МАЯК ОКО</Header.Heading>
                <Button
                    icon
                    onClick={() => {
                        sessionStorage.setItem("currentPage", "mayakOko");
                        goTo("mayakOko");
                    }}>
                    <CloseIcon />
                </Button>
            </Header>
            <div className="hero" style={{ placeItems: "center" }}>
                <div className="flex flex-col gap-[1.6rem] items-center h-full col-span-4 col-start-5 col-end-9">
                    <h3>Настройки</h3>
                    <div className="flex flex-col gap-[0.75rem]">
                        <div className="flex flex-col gap-[0.5rem]">
                            <span className="big">Данные токена</span>
                            <p className="small text-(--color-gray-black)">Это ваш токен доступа. Он имеет ограниченное количество использований. На шкале под полем отображается, сколько запросов уже израсходовано</p>
                        </div>
                        <Input
                            placeholder="Введите ваш токен"
                            value={token}
                            onChange={(e) => {
                                const value = e.target.value;
                                setToken(value);
                                validateToken(value);

                                // Наша новая логика
                                if (value.trim().toLowerCase() === "fffff") {
                                    setShowAdminLogin(true);
                                } else {
                                    setShowAdminLogin(false);
                                }
                            }}
                        />

                        {showNotification && tokenExists && (
                            <div className="flex flex-col gap-[1rem] items-center">
                                <span className="big p-3 bg-green-100 text-green-700 rounded-md">Тренажер активирован</span>
                                <span className="small text-(--color-gray-black)">
                                    Осталось попыток: {tokenRemainingAttempts}
                                </span>
                                <Button
                                    onClick={() => goTo("trainer")}
                                    className="w-full"
                                >
                                    Войти в тренажер
                                </Button>
                            </div>
                        )}

                        {showNotification && !tokenExists && <span className="big p-3 bg-yellow-100 text-yellow-700 rounded-md">Токен подходит. Заполните форму ниже для активации тренажера.</span>}

                        {tokenError && !showNotification && (
                            <span className="big p-3 bg-red-100 text-red-700 rounded-md">{tokenError}</span>
                        )}

                        {isValidating && (
                            <span className="big p-3 bg-blue-100 text-blue-700 rounded-md">Проверка токена...</span>
                        )}

                        <div className="flex flex-col gap-[0.25rem]">
                            <span className={getRangeClass(value)}>
                                {value}/{max}
                            </span>
                            <meter id="meter-my" min="0" max={max} low="30" high="80" optimum="100" value={value} className={getRangeClass(value)}></meter>
                        </div>
                    </div>

                    {showAdminLogin ? (
                        // --- СЕКРЕТНАЯ ФОРМА ДЛЯ ПАРОЛЯ ---
                        <form onSubmit={handleAdminLogin} className="flex flex-col gap-4 w-full mt-4">
                            <span className="big">Вход для администратора</span>
                            <Input type="password" placeholder="Введите пароль" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoFocus />
                            {adminLoginError && <p className="text-red-500 text-sm text-center">{adminLoginError}</p>}
                            <Button type="submit" className="blue w-full">
                                Войти
                            </Button>
                        </form>
                    ) : (
                        // --- ОБЫЧНАЯ ФОРМА ДЛЯ ПОЛЬЗОВАТЕЛЯ ---
                        <>
                            {!tokenExists && showNotification && (
                                <>
                                    <div className="flex flex-col gap-[0.75rem] w-full">
                                        <span className="big">Личные данные</span>
                                        <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                                            <div>
                                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Фамилия *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="lastName"
                                                    name="lastName"
                                                    value={userData.lastName}
                                                    onChange={handleUserDataChange}
                                                    className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Имя *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="firstName"
                                                    name="firstName"
                                                    value={userData.firstName}
                                                    onChange={handleUserDataChange}
                                                    className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">
                                                    Организация *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="college"
                                                    name="college"
                                                    value={userData.college}
                                                    onChange={handleUserDataChange}
                                                    className="input-wrapper w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-center w-full">
                                        <button
                                            onClick={saveData}
                                            disabled={isLoading}
                                            className={`px-8 py-3 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                                isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                                            }`}>
                                            {isLoading ? "Сохранение..." : "Сохранить результаты"}
                                        </button>
                                    </div>

                                    {saveSuccess && <div className="mt-6 p-3 bg-green-100 text-green-700 text-center rounded-md">Данные успешно сохранены!</div>}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
