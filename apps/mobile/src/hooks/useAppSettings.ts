import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getHoursGoal,
  getRemindersEnabled,
  getReminderThresholdHours,
  getStreakEnabled,
  setHoursGoal,
  setRemindersEnabled,
  setReminderThresholdHours,
  setStreakEnabled,
} from '@/settings/localSettings';

const STREAK_ENABLED_KEY = ['settings', 'streakEnabled'] as const;
const REMINDERS_ENABLED_KEY = ['settings', 'remindersEnabled'] as const;
const REMINDER_THRESHOLD_HOURS_KEY = ['settings', 'reminderThresholdHours'] as const;
const HOURS_GOAL_KEY = ['settings', 'hoursGoal'] as const;

export function useStreakEnabled() {
  return useQuery({ queryKey: STREAK_ENABLED_KEY, queryFn: getStreakEnabled });
}

export function useSetStreakEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setStreakEnabled,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: STREAK_ENABLED_KEY }),
  });
}

export function useRemindersEnabled() {
  return useQuery({ queryKey: REMINDERS_ENABLED_KEY, queryFn: getRemindersEnabled });
}

export function useSetRemindersEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setRemindersEnabled,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REMINDERS_ENABLED_KEY }),
  });
}

export function useReminderThresholdHours() {
  return useQuery({ queryKey: REMINDER_THRESHOLD_HOURS_KEY, queryFn: getReminderThresholdHours });
}

export function useSetReminderThresholdHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setReminderThresholdHours,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: REMINDER_THRESHOLD_HOURS_KEY }),
  });
}

export function useHoursGoal() {
  return useQuery({ queryKey: HOURS_GOAL_KEY, queryFn: getHoursGoal });
}

export function useSetHoursGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setHoursGoal,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: HOURS_GOAL_KEY }),
  });
}
