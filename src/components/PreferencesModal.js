import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import { usePreferences } from '../context/PreferencesContext';

const QUESTIONS = [
  {
    key: 'maso',
    text: 'Jíš maso?',
    detail: 'Kuřecí, vepřové, hovězí…',
    emoji: '🥩',
  },
  {
    key: 'ryby',
    text: 'Jíš ryby a mořské plody?',
    detail: 'Losos, treska, krevety…',
    emoji: '🐟',
  },
  {
    key: 'mlecne',
    text: 'Jíš mléčné výrobky a vejce?',
    detail: 'Jogurt, sýr, tvaroh, vejce…',
    emoji: '🥛',
  },
  {
    key: 'lustěniny',
    text: 'Máš rád luštěniny a alternativy?',
    detail: 'Čočka, cizrna, tofu, pohanka, quinoa…',
    emoji: '🫘',
  },
];

export default function PreferencesModal({ open }) {
  const { savePreferences } = usePreferences();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step) / QUESTIONS.length) * 100;

  const handleAnswer = (value) => {
    setAnswers((prev) => ({ ...prev, [question.key]: value }));
  };

  const handleNext = () => {
    if (isLast) {
      savePreferences(answers);
    } else {
      setStep((s) => s + 1);
    }
  };

  const currentAnswer = answers[question.key];

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <RestaurantMenuIcon color="primary" />
          <span>Tvé stravovací preference</span>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Pomůžeme ti najít recepty, které ti sedí
        </Typography>
      </DialogTitle>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mx: 3, mt: 1, borderRadius: 1 }}
      />

      <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
        <Typography variant="h2" sx={{ mb: 1 }}>
          {question.emoji}
        </Typography>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {question.text}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {question.detail}
        </Typography>

        <ToggleButtonGroup
          exclusive
          value={currentAnswer ?? null}
          onChange={(_, val) => val !== null && handleAnswer(val)}
          sx={{ gap: 2 }}
        >
          <ToggleButton
            value={true}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              '&.Mui-selected': { bgcolor: 'success.main', color: 'white', '&:hover': { bgcolor: 'success.dark' } },
            }}
          >
            ✅ Ano
          </ToggleButton>
          <ToggleButton
            value={false}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              '&.Mui-selected': { bgcolor: 'error.main', color: 'white', '&:hover': { bgcolor: 'error.dark' } },
            }}
          >
            ❌ Ne
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          {step + 1} / {QUESTIONS.length}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="contained"
          size="large"
          disabled={currentAnswer === undefined}
          onClick={handleNext}
          sx={{ px: 5, borderRadius: 2 }}
        >
          {isLast ? 'Uložit' : 'Další →'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
