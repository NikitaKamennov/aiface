// ModelSelector.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Button,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
} from "@mui/material";

interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

// Добавляем интерфейс пропсов
interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

// Добавляем типы квантизации
const QUANTIZATION_TYPES = [
  { value: "q2_K", label: "Q2_K" },
  { value: "q3_K_L", label: "Q3_K_L" },
  { value: "q3_K_M", label: "Q3_K_M" },
  { value: "q3_K_S", label: "Q3_K_S" },
  { value: "q4_0", label: "Q4_0" },
  { value: "q4_1", label: "Q4_1" },
  { value: "q4_K_M", label: "Q4_K_M (recommended)" },
  { value: "q4_K_S", label: "Q4_K_S" },
  { value: "q5_0", label: "Q5_0" },
  { value: "q5_1", label: "Q5_1" },
  { value: "q5_K_M", label: "Q5_K_M" },
  { value: "q5_K_S", label: "Q5_K_S" },
  { value: "q6_K", label: "Q6_K" },
  { value: "q8_0", label: "Q8_0 (recommended)" },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [quantizationType, setQuantizationType] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);

  const [openQuantizeDialog, setOpenQuantizeDialog] = useState(false);

  // Загрузка списка доступных моделей
  const fetchModels = async () => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      const data = await response.json();
      setAvailableModels(data.models);
    } catch (error) {
      console.error("Error fetching models:", error);
      setStatus({
        type: "error",
        message: "Ошибка при загрузке списка моделей",
      });
    }
  };

  // функция квантизации

  const quantizeModel = async () => {
    if (!newModelName.trim() || !quantizationType) return;

    setIsLoading(true);
    setStatus(null);
    setProgressStatus("Начало квантизации...");
    setProgressPercent(0);

    try {
      const response = await fetch("http://localhost:11434/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: `${newModelName}:${quantizationType}`,
          modelfile: `FROM ${newModelName}`,
          quantize: quantizationType,
        }),
      });

      if (!response.body) {
        throw new Error("Не удалось получить поток данных от сервера");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          // Если не было ошибок и процесс завершился успешно
          if (!hasError) {
            setStatus({
              type: "success",
              message: `Модель ${newModelName} успешно квантизирована с типом ${quantizationType}`,
            });
            fetchModels(); // Обновляем список моделей
          }
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line) continue;

          try {
            const data = JSON.parse(line);

            if (data.error) {
              hasError = true;
              throw new Error(data.error);
            }

            if (data.status) {
              // Обработка различных статусов
              switch (data.status) {
                case "quantizing":
                  setProgressStatus(`Выполняется квантизация модели...`);
                  break;
                case "creating system layer":
                  setProgressStatus("Создание системного слоя...");
                  break;
                case "writing model":
                  setProgressStatus("Запись модели...");
                  break;
                case "writing layers":
                  setProgressStatus("Запись слоёв модели...");
                  break;
                case "writing manifest":
                  setProgressStatus("Запись манифеста...");
                  break;
                case "success":
                  setProgressStatus("Завершение процесса...");
                  break;
                default:
                  setProgressStatus(data.status);
              }

              // Для процесса квантизации используем неопределенный прогресс
              setProgressPercent(-1);
            }
          } catch (e) {
            console.error("Ошибка при обработке ответа:", e);
            hasError = true;
            setStatus({
              type: "error",
              message: `Ошибка при квантизации: ${e.message}`,
            });
          }
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Ошибка при квантизации: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
      setNewModelName("");
      setQuantizationType("");
      setProgressStatus("");
      setProgressPercent(0);
    }
  };

  // Установка новой модели

  const installModel = async () => {
    if (!newModelName.trim()) return;

    setIsLoading(true);
    setStatus(null);
    setProgressStatus("Начало установки...");
    setProgressPercent(0);

    try {
      const response = await fetch("http://localhost:11434/api/pull", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newModelName,
        }),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line) continue;

          try {
            const data = JSON.parse(line);

            if (data.status === "pulling manifest") {
              setProgressStatus("Загрузка манифеста...");
            } else if (data.status.startsWith("downloading")) {
              const percent = data.completed
                ? Math.round((data.completed / data.total) * 100)
                : 0;
              setProgressStatus(`Загрузка: ${percent}%`);
              setProgressPercent(percent);
            } else if (data.status === "verifying sha256 digest") {
              setProgressStatus("Проверка загрузки...");
            } else if (data.status === "writing manifest") {
              setProgressStatus("Запись манифеста...");
            } else if (data.status === "success") {
              setStatus({
                type: "success",
                message: `Модель ${newModelName} успешно установлена`,
              });
              fetchModels();
              break;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error("Error parsing chunk:", e);
          }
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Ошибка установки модели: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
      setNewModelName("");
      setProgressStatus("");
      setProgressPercent(0);
    }
  };

  /// удаление модели

  const deleteModel = async () => {
    if (!newModelName.trim()) return;

    // Проверяем есть ли такая модель в списке
    const modelExists = availableModels.some(
      (model) => model.name === newModelName
    );

    if (!modelExists) {
      setStatus({
        type: "error",
        message: "Модель с таким названием не найдена",
      });
      return;
    }

    setIsLoading(true);
    setStatus(null);

    try {
      const response = await fetch("http://localhost:11434/api/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newModelName,
        }),
      });

      if (response.ok) {
        setStatus({
          type: "success",
          message: `Модель ${newModelName} успешно удалена`,
        });
        fetchModels(); // Обновляем список моделей
      } else {
        throw new Error("Failed to delete model");
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: `Ошибка при удалении модели: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
      setNewModelName("");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <Box sx={{ mb: 2 }}>
      {isLoading && progressStatus && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {progressStatus}
          </Typography>
          {progressPercent >= 0 ? (
            <LinearProgress variant="determinate" value={progressPercent} />
          ) : (
            <LinearProgress variant="indeterminate" />
          )}
        </Box>
      )}
      <Box display="flex" alignItems="center" gap={2}>
        <Typography variant="body2" sx={{ minWidth: "fit-content" }}>
          Модель:
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isLoading}
            size="small">
            {availableModels.map((model) => (
              <MenuItem key={model.name} value={model.name}>
                {model.name} ({model.details.parameter_size})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="Название новой модели"
          value={newModelName}
          onChange={(e) => setNewModelName(e.target.value)}
          disabled={isLoading}
          sx={{ minWidth: 200 }}
        />
        {/* <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={quantizationType}
            onChange={(e) => setQuantizationType(e.target.value)}
            disabled={isLoading}
            size="small"
            displayEmpty
            //@ts-ignore
            placeholder="Тип квантизации">
            <MenuItem value="" disabled>
              Тип квантизации
            </MenuItem>
            {QUANTIZATION_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl> */}

        {/* <Button
          size="small"
          variant="contained"
          color="secondary"
          onClick={() => setOpenQuantizeDialog(true)}
          disabled={!newModelName.trim() || !quantizationType || isLoading}>
          Кван
        </Button> */}

        <Dialog
          open={openQuantizeDialog}
          onClose={() => setOpenQuantizeDialog(false)}>
          <DialogTitle>Подтверждение квантизации</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Процесс квантизации может занять длительное время (от нескольких
              минут до часа) и требует значительных ресурсов компьютера.
              Убедитесь, что у вас достаточно свободной оперативной памяти.
              Выбранная модель: {newModelName}
              Тип квантизации: {quantizationType}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenQuantizeDialog(false)}>Отмена</Button>
            <Button
              onClick={() => {
                setOpenQuantizeDialog(false);
                quantizeModel();
              }}
              color="primary"
              autoFocus>
              Начать квантизацию
            </Button>
          </DialogActions>
        </Dialog>
        <Button
          size="small"
          variant="contained"
          onClick={installModel}
          disabled={!newModelName.trim() || isLoading}>
          Установить
        </Button>
        <Button
          size="small"
          variant="contained"
          color="error"
          onClick={deleteModel}
          disabled={!newModelName.trim() || isLoading}>
          Удалить
        </Button>
      </Box>

      {status && (
        <Alert
          severity={status.type}
          sx={{ mt: 1 }}
          //@ts-ignore
          size="small">
          {status.message}
        </Alert>
      )}
    </Box>
  );
};

export default ModelSelector;
