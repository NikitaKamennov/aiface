// @ts-nocheck
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Slider,
  Fade,
  LinearProgress,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import style from "./AIHomepage.module.scss";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AIContext from "./AIContext";
import ModelSelector from "./ModelSelector";
import { useContext } from "react";
import { useTheme } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { ColorModeContext } from "./ThemeProvider";
import { Settings as SettingsIcon } from "@mui/icons-material"; // Добавьте в импорты

// Константы для контекста
const MAX_CONTEXT_LENGTH = 128 * 1024; // 128K символов
const CONTEXT_WARNING_THRESHOLD = 0.8; // 80% от максимума
const OLLAMA_API_URL = "http://localhost:11434/api/chat";

const PERSONAS = {
  superCoder: {
    name: "Квен Кодер",
    avatar: "/images/analyst.jpg",
    color: "#2196f3",
    shortName: "KK",
  },
  coder: {
    name: "Кодер",
    avatar: "/images/1212.jpg",
    color: "#f50057",
    shortName: "К",
  },
  taxiDriver: {
    name: "Умриджон",
    avatar: "/images/1111.jpg",
    color: "#ff9800",
    shortName: "У",
  },
};

type Message = { role: string; content: string };
type Persona = {
  name: string;
  avatar: string;
  color: string;
  shortName: string;
};

/// тема

const ThemeToggleButton = () => {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  return (
    <IconButton
      sx={{ ml: 1 }}
      onClick={colorMode.toggleColorMode}
      color="inherit">
      {theme.palette.mode === "dark" ? (
        <Brightness7Icon />
      ) : (
        <Brightness4Icon />
      )}
    </IconButton>
  );
};

// Утилиты для работы с контекстом
const getContextLength = (messages: Message[]): number => {
  return messages.reduce((acc, msg) => acc + msg.content.length, 0);
};

const getContextPercentage = (currentLength: number): number => {
  return (currentLength / MAX_CONTEXT_LENGTH) * 100;
};

const trimContextIfNeeded = (messages: Message[]): Message[] => {
  const systemMessage = messages.find((msg) => msg.role === "system");
  let contextMessages = messages.filter((msg) => msg.role !== "system");
  let currentLength = getContextLength(contextMessages);

  while (currentLength > MAX_CONTEXT_LENGTH && contextMessages.length > 0) {
    contextMessages.shift(); // Удаляем самое старое сообщение
    currentLength = getContextLength(contextMessages);
  }

  return systemMessage ? [systemMessage, ...contextMessages] : contextMessages;
};

// Компонент кнопки копирования
const CopyButton = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <IconButton className={style.copyButton} onClick={handleCopy} size="small">
      {copied ? (
        <CheckIcon fontSize="small" />
      ) : (
        <ContentCopyIcon fontSize="small" />
      )}
    </IconButton>
  );
};

const AIHomePage = () => {
  const [role, setRole] = useState("superCoder");
  const [message, setMessage] = useState<string>("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentPersona, setCurrentPersona] = useState<Persona>(
    PERSONAS.superCoder
  );
  const [contextLength, setContextLength] = useState(0);
  const messagesEndRef = useRef(null);
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(
    new Set()
  );
  const [autoScroll, setAutoScroll] = useState(true);
  const chatWindowRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState("qwen2.5-coder:7b");
  const [temperature, setTemperature] = useState(() => {
    const savedTemp = localStorage.getItem("temperature");
    return savedTemp ? parseFloat(savedTemp) : 0;
  });
  const [showSettings, setShowSettings] = useState(false);

  // Эффект для отслеживания размера контекста
  useEffect(() => {
    const length = getContextLength(conversation);
    setContextLength(length);
  }, [conversation]);

  // Юзик для сохранения температуры
  useEffect(() => {
    localStorage.setItem("temperature", temperature.toString());
  }, [temperature]);

  const toggleMessage = (index: number) => {
    setExpandedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const parseMessageContent = (content: string) => {
    const parts = [];
    let currentText = "";
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith("```")) {
        if (currentText.trim()) {
          parts.push({ type: "text", content: currentText.trim() });
          currentText = "";
        }
        let codeContent = "";
        i++;
        while (i < lines.length && !lines[i].startsWith("```")) {
          codeContent += lines[i] + "\n";
          i++;
        }
        parts.push({ type: "code", content: codeContent.trim() });
        continue;
      }

      const titleRegex = /(?:^|\s*)(###\s*.*?)(?=\n|$)/g;
      let lastIndex = 0;
      let match;

      while ((match = titleRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          currentText += line.substring(lastIndex, match.index);
        }

        if (currentText.trim()) {
          parts.push({ type: "text", content: currentText.trim() });
          currentText = "";
        }

        const titleContent = match[1].replace(/^###\s*/, "").trim();
        parts.push({ type: "title", content: titleContent });
        currentText += titleContent;

        lastIndex = match.index + match[0].length;
      }

      // Если после обработки ### остался текст, обрабатываем звездочки
      if (lastIndex < line.length) {
        const boldRegex =
          /(?:^|\s*)(\d+[:.]\s*|\d+\.\s*|\d+\s+)?(\*\*(.*?)\*\*)/g;
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(line)) !== null) {
          // Добавляем текст до совпадения
          if (match.index > lastIndex) {
            currentText += line.substring(lastIndex, match.index);
          }

          if (currentText.trim()) {
            parts.push({ type: "text", content: currentText.trim() });
            currentText = "";
          }

          // Извлекаем номер (если есть) и содержимое между звездочками
          const numberPrefix = match[1] || "";
          const content = match[3]; // Используем группу 3, так как группа 2 содержит звездочки

          // Формируем полный контент с номером
          const fullContent = (numberPrefix + content).trim();

          // Добавляем как header
          parts.push({ type: "header", content: fullContent });

          // Добавляем этот же текст обратно в поток
          currentText += fullContent;

          lastIndex = match.index + match[0].length;
        }
        if (lastIndex < line.length) {
          currentText += line.substring(lastIndex);
        }
      }
      currentText += "\n";
    }
    if (currentText.trim()) {
      parts.push({ type: "text", content: currentText.trim() });
    }
    return parts;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const roles = [
    {
      value: "superCoder",
      label: "Супер программист",
      systemMessage:
        "You're a very good assistant. You're thoughtful and give very thoughtful answers. you are the best JS and TS programmer. give me the best code. with best practices. Let's explain it in Russian.mark the code with triple reverse marks at the beginning and at the end of the ```code ```",
    },
    {
      value: "coder",
      label: "программист",
      systemMessage:
        "You're a great assistant, and you'll show us the best practices in your answer. Let's explain it in Russian.mark the code with triple reverse marks at the beginning and at the end of the ```code ```",
    },
    {
      value: "taxiDriver",
      label: "Таксист, который во всем разбирается",
      systemMessage:
        "Ты таксист, который во всём разбирается. В ответе надо как то плавно упомянуть, что ты в принципе занимаешься извозом для 'для души'. 'таксую для души' а так вообще у тебя богатый опыт именно в той сфере про которую вопрос и ты в ней специалист и зарабатываешь много денег в ней. Ты очень хороший помощник и молодец. Рассудительный и вдумчивый. Ты даёшь очень подробные структурированные и обстоятельные ответы на русском языке.",
    },
  ];

  /////////////////// функ бубуйнук

  useEffect(() => {
    const selectedRole = roles.find((r) => r.value === role);
    // Сохраняем предыдущие сообщения при смене роли
    setConversation((prev) => {
      const withoutSystem = prev.filter((msg) => msg.role !== "system");
      return [
        { role: "system", content: selectedRole.systemMessage },
        ...withoutSystem,
      ];
    });
    setCurrentPersona(PERSONAS[role]);
  }, [role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = { role: "user", content: message };
    setIsLoading(true); // Начало загрузки
    try {
      const selectedRole = roles.find((r) => r.value === role);

      // Формируем полный массив сообщений с учетом контекста
      let messagesToSend = [
        { role: "system", content: selectedRole.systemMessage },
        ...conversation.filter((msg) => msg.role !== "system"),
        userMessage,
      ];

      // Обрезаем контекст если нужно
      messagesToSend = trimContextIfNeeded(messagesToSend);

      // Обновляем состояние беседы
      setConversation(messagesToSend);
      setMessage("");

      const response = await fetch(OLLAMA_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: currentModel,
          messages: messagesToSend,
          options: {
            seed: 123, // Фиксированный seed
            temperature: temperature, // Небольшая вариативность
            num_ctx: 128000, // Максимальный размер контекста
          },
        }),
      });

      if (!response.body) {
        throw new Error("ReadableStream not supported");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const parsedLine = JSON.parse(line);
            fullResponse += parsedLine.message?.content || "";
          } catch (error) {
            console.error("Error parsing line:", error);
          }
        }

        setConversation((prev) => {
          const newConversation = [...prev];
          const lastMessage = newConversation[newConversation.length - 1];

          if (lastMessage?.role === "assistant") {
            lastMessage.content = fullResponse;
          } else {
            newConversation.push({
              role: "assistant",
              content: fullResponse,
            });
          }

          return trimContextIfNeeded(newConversation); // Обрезаем контекст при обновлении
        });
      }
    } catch (error) {
      console.error("Ошибка при получении ответа от нейросети:", error);
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Произошла ошибка при получении ответа. Пожалуйста, попробуйте еще раз.",
        },
      ]);
    } finally {
      setIsLoading(false); // Конец загрузки
    }
  };

  const handleRoleChange = (event) => {
    setRole(event.target.value);
  };

  return (
    <Box className={style.wrapper} sx={{ position: "relative" }}>
      <IconButton
        onClick={() => setShowSettings(!showSettings)}
        sx={{ position: "relative", top: 36, right: 180 }}>
        <SettingsIcon />
      </IconButton>
      <Fade in={showSettings} timeout={300}>
        <Box
          sx={{
            maxWidth: 800,
            minWidth: 800,
            position: "absolute",
            top: 100,
            right: 0,
            backgroundColor: "background.paper", // автоматически меняется с темой
            opacity: 0.8, // прозрачность
            backdropFilter: "blur(8px)",
            boxShadow: 1, // тень
            borderRadius: 1,
            padding: 2,
            zIndex: 40,
          }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row",
            }}>
            <FormControl
              sx={{
                width: "300px",
                margin: "8px 0",
                "& .MuiInputLabel-root": {
                  fontSize: "0.875rem",
                },
                "& .MuiSelect-select": {
                  fontSize: "0.875rem",
                  padding: "4px 8px",
                },
                "& .MuiMenuItem-root": {
                  fontSize: "0.875rem",
                  minHeight: "32px",
                },
              }}
              fullWidth
              margin="normal">
              <InputLabel id="role-select-label">Выберите роль</InputLabel>
              <Select
                labelId="role-select-label"
                value={role}
                label="Выберите роль"
                onChange={handleRoleChange}>
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            &nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            &nbsp;&nbsp;&nbsp;
            <Box sx={{ width: 100, mt: 2, mb: 2 }}>
              <Typography gutterBottom sx={{ fontSize: 13 }}>
                Глюки: {temperature}
              </Typography>
              <Slider
                value={temperature}
                onChange={(_, newValue) => setTemperature(newValue as number)}
                step={0.1}
                min={0}
                max={1.0}
                scale={(x) => x}
                valueLabelDisplay="auto"
                sx={{
                  width: "100%",
                  "& .MuiSlider-rail": {
                    opacity: 0.5,
                  },
                  "& .MuiSlider-mark": {
                    backgroundColor: "#bfbfbf",
                    "&.MuiSlider-markActive": {
                      opacity: 1,
                      backgroundColor: "currentColor",
                    },
                  },
                }}
              />
            </Box>
            &nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            &nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;&nbsp;&nbsp;
            <ThemeToggleButton />
          </Box>

          <ModelSelector
            selectedModel={currentModel}
            onModelChange={(model) => {
              setCurrentModel(model);
              console.log("Model changed to:", model);
            }}
          />
        </Box>
      </Fade>

      {/* Индикатор контекста */}
      <AIContext
        conversation={conversation}
        setConversation={setConversation}
        contextLength={contextLength}
      />
      <Paper elevation={3} className={style.chatWindow} ref={chatWindowRef}>
        <List>
          {conversation
            .filter((msg) => msg.role !== "system")
            .map((msg, index) => (
              <div key={index}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    {msg.role === "user" ? (
                      <Avatar sx={{ bgcolor: "#9c27b0" }}>В</Avatar>
                    ) : (
                      <Avatar
                        src={currentPersona.avatar}
                        sx={{ bgcolor: currentPersona.color }}
                        onError={(e) => {
                          e.target.src = "";
                          e.target.alt = currentPersona.shortName;
                        }}>
                        {currentPersona.shortName}
                      </Avatar>
                    )}
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography>
                          {msg.role === "user" ? "Вы" : currentPersona.name}
                        </Typography>
                        {msg.role === "user" && (
                          <IconButton
                            size="small"
                            onClick={() => toggleMessage(index)}
                            sx={{ ml: 1 }}>
                            {expandedMessages.has(index) ? (
                              <KeyboardArrowUpIcon />
                            ) : (
                              <KeyboardArrowDownIcon />
                            )}
                          </IconButton>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {msg.role === "user" && !expandedMessages.has(index) ? (
                          <Typography
                            component="span"
                            variant="body2"
                            className={`${style.messageText} ${style.collapsed}`}
                            onClick={() => toggleMessage(index)}
                            sx={{ cursor: "pointer" }}>
                            {msg.content.split("\n")[0]}...
                          </Typography>
                        ) : (
                          parseMessageContent(msg.content).map(
                            (part, partIndex) => (
                              <React.Fragment key={partIndex}>
                                {part.type === "text" ? (
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    className={style.messageText}
                                    sx={
                                      part.content.startsWith("###")
                                        ? {
                                            fontWeight: "bold",
                                            fontSize: "1.1rem",
                                            color: "primary.main",
                                            display: "block",
                                            mt: 2,
                                            mb: 1,
                                          }
                                        : undefined
                                    }>
                                    {part.content}
                                  </Typography>
                                ) : part.type === "code" ? (
                                  <Box className={style.codeWrapper}>
                                    <SyntaxHighlighter
                                      language="javascript"
                                      style={materialDark}
                                      customStyle={{
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        padding: "16px",
                                        margin: "16px 0",
                                      }}>
                                      {part.content}
                                    </SyntaxHighlighter>
                                    <CopyButton code={part.content} />
                                  </Box>
                                ) : part.type === "listItem" ? (
                                  <Typography
                                    component="div"
                                    variant="body2"
                                    sx={{
                                      pl: 2,
                                      display: "flex",
                                      alignItems: "flex-start",
                                      "&::before": {
                                        content: '"•"',
                                        color: "primary.main",
                                        mr: 1,
                                        fontWeight: "bold",
                                      },
                                    }}>
                                    {part.content}
                                  </Typography>
                                ) : null}
                              </React.Fragment>
                            )
                          )
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                <Divider variant="inset" component="li" />
              </div>
            ))}
          <div ref={messagesEndRef} />
        </List>
      </Paper>
      {!isLoading ? (
        <form onSubmit={handleSubmit} className={style.inputForm}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={4}
            variant="outlined"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Введите ваш вопрос..."
          />
          <IconButton
            type="submit"
            color="primary"
            aria-label="send"
            className={style.sendButton}>
            <SendIcon />
          </IconButton>
        </form>
      ) : (
        <Box className={style.loadingBox}>
          <Typography className={style.loadingText}>
            Нейросеть генерирует ответ...
            {/* <CircularProgress size={20} thickness={4} /> */}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default AIHomePage;
