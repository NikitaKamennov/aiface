// // AIContext.tsx
// import React from "react";
// import {
//   Box,
//   Button,
//   Typography,
//   Menu,
//   MenuItem,
//   LinearProgress,
// } from "@mui/material";
// import SaveIcon from "@mui/icons-material/Save";
// import RestoreIcon from "@mui/icons-material/Restore";
// import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";

// interface AIContextProps {
//   conversation: Array<{ role: string; content: string }>;
//   setConversation: (
//     conversation: Array<{ role: string; content: string }>
//   ) => void;
//   contextLength: number;
// }

// const STORAGE_KEY = "ai-conversation-contexts";

// const getContextKey = (
//   conversation: Array<{ role: string; content: string }>
// ) => {
//   const date = new Date().toLocaleString("ru", {
//     day: "2-digit",
//     month: "2-digit",
//     year: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//   });

//   const firstMessage =
//     conversation.find((msg) => msg.role === "user")?.content || "";
//   const preview =
//     firstMessage.slice(0, 20) + (firstMessage.length > 20 ? "..." : "");

//   return `${date} - ${preview}`;
// };

// const AIContext: React.FC<AIContextProps> = ({
//   conversation,
//   setConversation,
//   contextLength,
// }) => {
//   const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
//   const [savedContexts, setSavedContexts] = React.useState<{
//     [key: string]: Array<{ role: string; content: string }>;
//   }>({});

//   React.useEffect(() => {
//     const saved = localStorage.getItem(STORAGE_KEY);
//     if (saved) {
//       setSavedContexts(JSON.parse(saved));
//     }
//   }, []);

//   const handleSave = () => {
//     const key = getContextKey(conversation);
//     const newContexts = {
//       ...savedContexts,
//       [key]: conversation,
//     };
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(newContexts));
//     setSavedContexts(newContexts);
//   };

//   const handleReset = () => {
//     setConversation([]);
//   };

//   const handleLoadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
//     setAnchorEl(event.currentTarget);
//   };

//   const handleLoadContext = (key: string) => {
//     setConversation(savedContexts[key]);
//     setAnchorEl(null);
//   };

//   const handleClose = () => {
//     setAnchorEl(null);
//   };

//   return (
//     <Box sx={{ mb: 2 }}>
//       <Box
//         display="flex"
//         justifyContent="space-between"
//         alignItems="center"
//         mb={1}>
//         <Typography variant="body2">
//           Контекст: {(contextLength / 1024).toFixed(2)}K / 128K
//         </Typography>
//         <Box>
//           <Button
//             size="small"
//             startIcon={<SaveIcon />}
//             onClick={handleSave}
//             sx={{ mr: 1 }}>
//             Сохранить
//           </Button>
//           <Button
//             size="small"
//             startIcon={<RestoreIcon />}
//             onClick={handleLoadClick}
//             sx={{ mr: 1 }}>
//             Загрузить
//           </Button>
//           <Button
//             size="small"
//             startIcon={<DeleteSweepIcon />}
//             onClick={handleReset}
//             color="error">
//             Сбросить
//           </Button>
//         </Box>
//       </Box>
//       <LinearProgress
//         variant="determinate"
//         value={(contextLength / (128 * 1024)) * 100}
//       />

//       <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
//         {Object.keys(savedContexts).map((key) => (
//           <MenuItem key={key} onClick={() => handleLoadContext(key)}>
//             {key}
//           </MenuItem>
//         ))}
//       </Menu>
//     </Box>
//   );
// };

// export default AIContext;
// AIContext.tsx
import React from "react";
import {
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

interface AIContextProps {
  conversation: Array<{ role: string; content: string }>;
  setConversation: (
    conversation: Array<{ role: string; content: string }>
  ) => void;
  contextLength: number;
}

const STORAGE_KEY = "ai-conversation-contexts";

const getContextKey = (
  conversation: Array<{ role: string; content: string }>
) => {
  const date = new Date().toLocaleString("ru", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const firstMessage =
    conversation.find((msg) => msg.role === "user")?.content || "";
  const preview =
    firstMessage.slice(0, 20) + (firstMessage.length > 20 ? "..." : "");

  return `${date} - ${preview}`;
};

const AIContext: React.FC<AIContextProps> = ({
  conversation,
  setConversation,
  contextLength,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [savedContexts, setSavedContexts] = React.useState<{
    [key: string]: Array<{ role: string; content: string }>;
  }>({});
  const [openConfirmDialog, setOpenConfirmDialog] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSavedContexts(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    const key = getContextKey(conversation);
    const newContexts = {
      ...savedContexts,
      [key]: conversation,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContexts));
    setSavedContexts(newContexts);
  };

  const handleReset = () => {
    setConversation([]);
  };

  const handleClearStorage = () => {
    setOpenConfirmDialog(true);
  };

  const confirmClearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedContexts({});
    setOpenConfirmDialog(false);
  };

  const handleLoadClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLoadContext = (key: string) => {
    setConversation(savedContexts[key]);
    setAnchorEl(null);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}>
        <Typography variant="body2">
          Контекст: {(contextLength / 1024).toFixed(2)}K / 128K
        </Typography>
        <Box>
          <Button
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ mr: 1 }}>
            Сохранить
          </Button>
          <Button
            size="small"
            startIcon={<RestoreIcon />}
            onClick={handleLoadClick}
            sx={{ mr: 1 }}>
            Загрузить
          </Button>
          <Button
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={handleReset}
            color="error"
            sx={{ mr: 1 }}>
            Сбросить
          </Button>
          <Button
            size="small"
            startIcon={<DeleteForeverIcon />}
            onClick={handleClearStorage}
            color="error">
            Очистить хранилище
          </Button>
        </Box>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(contextLength / (128 * 1024)) * 100}
      />

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {Object.keys(savedContexts).map((key) => (
          <MenuItem key={key} onClick={() => handleLoadContext(key)}>
            {key}
          </MenuItem>
        ))}
      </Menu>

      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}>
        <DialogTitle>Подтверждение</DialogTitle>
        <DialogContent>
          Вы уверены, что хотите удалить все сохраненные контексты?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Отмена</Button>
          <Button onClick={confirmClearStorage} color="error" autoFocus>
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIContext;
