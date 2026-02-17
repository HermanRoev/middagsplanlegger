import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput, ScrollView, Modal, Keyboard } from 'react-native';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../context/auth';
import { getInboxMeals, voteForMeal, addSuggestion, approveSuggestion, rejectSuggestion, addPlannedSuggestionMeal } from '../../lib/api';
import { Suggestion } from '../../../src/types';
import { ThumbsUp, Check, X, Plus, Trash, Calendar, Utensils, MessageSquarePlus } from 'lucide-react-native';
import { addDays, format, isSameDay, parseISO } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function Inbox() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<Suggestion | null>(null);
  const [approveDate, setApproveDate] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');

  // Stable primitive for dependency arrays — prevents re-renders when user object reference changes
  const userId = user?.uid;
  // Ref to access full user object in callbacks without it being a dependency
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!userId) return;
    async function fetchInbox() {
      try {
        const data = await getInboxMeals();
        setSuggestions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchInbox();
  }, [userId]);

  const fetchInbox = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getInboxMeals();
      setSuggestions(data);
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  const handleAddSuggestion = useCallback(async () => {
    const u = userRef.current;
    if (!inputValue.trim() || !u) return;
    setAdding(true);
    try {
        await addSuggestion(
            inputValue,
            u.uid,
            u.displayName || u.email || 'Bruker',
            selectedDate || undefined
        );
        setInputValue('');
        Keyboard.dismiss();
        fetchInbox();
    } catch (error) {
        Alert.alert('Feil', 'Kunne ikke sende forslag');
    } finally {
        setAdding(false);
    }
  }, [inputValue, selectedDate, fetchInbox]);

  const handleVote = useCallback(async (suggestion: Suggestion) => {
    const u = userRef.current;
    if (!u) return;
    try {
      const hasVoted = suggestion.votedBy?.includes(u.uid);
      await voteForMeal(suggestion.id, u.uid, !hasVoted);

      setSuggestions(prev => prev.map(s => {
        if (s.id === suggestion.id) {
          const newVotedBy = hasVoted
            ? s.votedBy?.filter(id => id !== u.uid)
            : [...(s.votedBy || []), u.uid];
          return { ...s, votedBy: newVotedBy, votes: (newVotedBy || []).length };
        }
        return s;
      }));
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke stemme');
    }
  }, []);

  const handleApprove = useCallback(async (id: string) => {
      const u = userRef.current;
      try {
        // Use functional state access to avoid depending on suggestions array
        let suggestion: Suggestion | undefined;
        setSuggestions(prev => {
          suggestion = prev.find(s => s.id === id);
          return prev; // no mutation, just reading
        });
        if (!suggestion) return;
          if (!suggestion.forDate) {
            setApproveTarget(suggestion);
            setApproveDate(selectedDate || format(new Date(), 'yyyy-MM-dd'));
            setShowApproveModal(true);
            return;
          }
          await addPlannedSuggestionMeal(
            suggestion.text,
            suggestion.forDate,
            u?.uid,
            u?.displayName || u?.email || 'Bruker'
          );
          await approveSuggestion(id);
          setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
      } catch (error) {
          Alert.alert('Feil', 'Kunne ikke godkjenne');
      }
  }, [selectedDate]);

  const confirmApprove = async () => {
    if (!approveTarget || !approveDate) return;
    const u = userRef.current;
    try {
      await addPlannedSuggestionMeal(
        approveTarget.text,
        approveDate,
        u?.uid,
        u?.displayName || u?.email || 'Bruker'
      );
      await approveSuggestion(approveTarget.id);
      setSuggestions(prev => prev.map(s => s.id === approveTarget.id ? { ...s, status: 'approved' } : s));
      setShowApproveModal(false);
      setApproveTarget(null);
    } catch (error) {
      Alert.alert('Feil', 'Kunne ikke godkjenne');
    }
  };

  const handleReject = useCallback(async (id: string) => {
      Alert.alert('Fjern forslag', 'Er du sikker på at du vil fjerne dette forslaget?', [
          { text: 'Avbryt', style: 'cancel' },
          { text: 'Fjern', style: 'destructive', onPress: async () => {
              try {
                  await rejectSuggestion(id);
                  setSuggestions(prev => prev.filter(s => s.id !== id));
              } catch (error) {
                  Alert.alert('Feil', 'Kunne ikke fjerne forslaget');
              }
          }}
      ]);
  }, []);

  const dates = useMemo(() => [
      { label: 'Generelt', value: null },
      { label: 'I dag', value: format(new Date(), 'yyyy-MM-dd') },
      { label: 'I morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
      ...Array.from({ length: 5 }).map((_, i) => {
          const d = addDays(new Date(), i + 2);
          return { label: format(d, 'EEE d. MMM', { locale: nb }), value: format(d, 'yyyy-MM-dd') };
      })
  ], []);

  const combinedData = useMemo(() => {
    const general = suggestions
        .filter(s => !s.forDate)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));

    const dated = suggestions
        .filter(s => !!s.forDate)
        .sort((a, b) => (a.forDate || '').localeCompare(b.forDate || ''));

    return [...general, ...dated];
  }, [suggestions]);

  const renderItem = useCallback(({ item, index }: { item: Suggestion, index: number }) => {
    const hasVoted = item.votedBy?.includes(userId || '');
    const isApproved = item.status === 'approved';
    const prevItem = index > 0 ? combinedData[index - 1] : null;

    // Header Logic
    const showGeneralHeader = index === 0 && !item.forDate;
    const showDateHeader = item.forDate && (!prevItem || prevItem.forDate !== item.forDate);

    let headerText = '';
    if (showGeneralHeader) headerText = 'Generelle ønsker';
    if (showDateHeader) {
        const d = parseISO(item.forDate!);
        if (isSameDay(d, new Date())) headerText = 'I dag';
        else if (isSameDay(d, addDays(new Date(), 1))) headerText = 'I morgen';
        else headerText = format(d, 'EEEE d. MMM', { locale: nb });
    }

    return (
      <View>
          {(showGeneralHeader || showDateHeader) && (
              <View className="flex-row items-center gap-x-4 mt-8 mb-4 px-1">
                  <Text className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">
                      {headerText}
                  </Text>
                  <View className="h-px flex-1 bg-gray-100" />
              </View>
          )}

          <View className={`p-5 rounded-[28px] mb-4 border shadow-sm ${isApproved ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100'}`}>
            <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 mr-4">
                    <Text className="text-gray-900 font-black text-xl leading-tight">
                        {item.text}
                    </Text>
                    <View className="flex-row items-center mt-1.5">
                        <Text className="text-gray-400 font-bold text-xs">
                            {item.suggestedBy?.name || 'Ukjent'}
                        </Text>
                        {item.forDate && (
                            <View className="flex-row items-center bg-indigo-50 px-2 py-0.5 rounded-lg ml-3">
                                <Calendar size={10} color="#4F46E5" />
                                <Text className="text-indigo-600 text-[10px] font-black uppercase tracking-widest ml-1">
                                    {format(parseISO(item.forDate), 'd. MMM', { locale: nb })}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isApproved ? 'bg-emerald-100' : 'bg-indigo-50'}`}>
                    <Utensils size={24} color={isApproved ? '#10B981' : '#6366F1'} />
                </View>
            </View>

            <View className="flex-row justify-between items-center mt-2 border-t border-gray-200 pt-4">
            {isApproved ? (
                <View className="flex-row items-center justify-between w-full">
                    <View className="bg-emerald-500 px-4 py-2 rounded-xl flex-row items-center shadow-lg shadow-emerald-100">
                        <Check size={14} color="white" strokeWidth={3} />
                        <Text className="text-white text-[10px] font-black uppercase tracking-widest ml-2">Godkjent</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleReject(item.id)} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <Trash size={18} color="#EF4444" opacity={0.5} />
                    </TouchableOpacity>
                </View>
            ) : (
                <View className="flex-row items-center justify-between w-full">
                    <TouchableOpacity
                        onPress={() => handleVote(item)}
                        activeOpacity={0.7}
                        className={`flex-row items-center px-5 py-2.5 rounded-2xl border ${
                        hasVoted
                            ? 'bg-indigo-50 border-indigo-200'
                            : 'bg-white border-gray-100'
                        }`}
                    >
                        <ThumbsUp
                        size={16}
                        color={hasVoted ? '#4F46E5' : '#9CA3AF'}
                        fill={hasVoted ? '#4F46E5' : 'transparent'}
                        />
                        <Text className={`ml-2.5 font-black text-sm ${hasVoted ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {item.votes || 0}
                        </Text>
                    </TouchableOpacity>

                    <View className="flex-row gap-x-2">
                        <TouchableOpacity onPress={() => handleApprove(item.id)} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                            <Check size={20} color="#10B981" strokeWidth={3} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleReject(item.id)} className="p-3 bg-red-50 rounded-xl border border-red-100 shadow-sm">
                            <X size={20} color="#EF4444" strokeWidth={3} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            </View>
        </View>
      </View>
    );
  }, [userId, combinedData, handleVote, handleApprove, handleReject]);

  return (
    <View className="flex-1 bg-white">
      {/* Header Area */}
      <View className="bg-white px-6 pb-4 pt-16 border-b border-gray-200 flex-row justify-between items-end">
        <View>
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Familien</Text>
          <Text className="text-3xl font-black text-gray-900 tracking-tight">Forslag</Text>
        </View>
        <View className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
            <MessageSquarePlus size={24} color="#6366F1" />
        </View>
      </View>

      {/* Input Area */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row items-center bg-gray-50 border border-gray-100 rounded-[20px] px-4 py-1 shadow-inner">
          <TextInput
            ref={inputRef}
            className="flex-1 h-12 text-gray-900 font-bold"
            placeholder="Hva har du lyst på?..."
            placeholderTextColor="#9CA3AF"
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleAddSuggestion}
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleAddSuggestion}
            disabled={!inputValue.trim() || adding}
            className={`w-10 h-10 rounded-full items-center justify-center ${!inputValue.trim() ? 'bg-gray-200' : 'bg-indigo-600 shadow-lg shadow-indigo-200'}`}
          >
            {adding ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Plus size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4" contentContainerStyle={{ paddingRight: 20 }}>
            <View className="flex-row items-center gap-x-2">
                {dates.map((dateOption) => {
                    const isSelected = selectedDate === dateOption.value;
                    return (
                        <TouchableOpacity
                            key={dateOption.label}
                            onPress={() => setSelectedDate(dateOption.value)}
                            className={`px-5 py-2.5 rounded-[18px] border ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white border-gray-100'
                            }`}
                        >
                            <Text className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                {dateOption.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={combinedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20 opacity-30">
              <MessageSquarePlus size={80} color="#9CA3AF" />
              <Text className="text-gray-500 font-black uppercase tracking-widest mt-4 text-center">Ingen forslag ennå</Text>
            </View>
          }
        />
      )}

      {/* Approve Modal */}
      <Modal visible={showApproveModal} transparent animationType="slide" onRequestClose={() => setShowApproveModal(false)}>
        <View className="flex-1 justify-end bg-black/50 p-4 pb-10">
          <View className="bg-white rounded-[40px] p-8 shadow-2xl">
            <View className="flex-row justify-between items-center mb-8">
              <View>
                <Text className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Godkjenn forslag</Text>
                <Text className="text-2xl font-black text-gray-900 uppercase tracking-tight">Velg dato</Text>
              </View>
              <TouchableOpacity onPress={() => setShowApproveModal(false)} className="bg-gray-50 p-2 rounded-full">
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View className="gap-y-2 mb-8">
              {dates.map((d) => (
                <TouchableOpacity
                  key={d.label}
                  onPress={() => setApproveDate(d.value)}
                  activeOpacity={0.7}
                  className={`p-5 rounded-[24px] border ${approveDate === d.value ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-gray-50 border-gray-100'}`}
                >
                  <Text className={`font-black uppercase tracking-widest text-xs ${approveDate === d.value ? 'text-white' : 'text-gray-400'}`}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
                onPress={confirmApprove}
                activeOpacity={0.8}
                className="bg-indigo-600 rounded-[28px] py-5 items-center shadow-xl shadow-indigo-200"
            >
              <Text className="text-white font-black uppercase tracking-widest text-sm">Godkjenn og planlegg</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
