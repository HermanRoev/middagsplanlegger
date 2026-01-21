import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/auth';
import { getInboxMeals, voteForMeal, addSuggestion, approveSuggestion, rejectSuggestion } from '../../lib/api';
import { Suggestion } from '../../../src/types';
import { ThumbsUp, Check, X, Plus, Trash } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export default function Inbox() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchInbox();
  }, [user]);

  async function fetchInbox() {
    if (!user) return;
    try {
      const data = await getInboxMeals();
      // Keep all suggestions to show approved ones as well, similar to web?
      // Web filters visual display but fetches all.
      // Let's filter to pending + recently approved for simplicity or just sort them.
      // The web shows all.
      setSuggestions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleAddSuggestion = async () => {
    if (!newSuggestion.trim() || !user) return;
    setAdding(true);
    try {
        await addSuggestion(newSuggestion, user.uid, user.displayName || user.email || 'User');
        setNewSuggestion('');
        fetchInbox(); // Refresh list
    } catch (error) {
        Alert.alert('Error', 'Failed to add suggestion');
    } finally {
        setAdding(false);
    }
  };

  const handleVote = async (suggestion: Suggestion) => {
    if (!user) return;
    try {
      const hasVoted = suggestion.votedBy?.includes(user.uid);
      await voteForMeal(suggestion.id, user.uid, !hasVoted);

      // Optimistic update
      setSuggestions(prev => prev.map(s => {
        if (s.id === suggestion.id) {
          const newVotedBy = hasVoted
            ? s.votedBy?.filter(id => id !== user.uid)
            : [...(s.votedBy || []), user.uid];
          return { ...s, votedBy: newVotedBy, votes: (newVotedBy || []).length };
        }
        return s;
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const handleApprove = async (id: string) => {
      try {
          await approveSuggestion(id);
          // Optimistic update
          setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
      } catch (error) {
          Alert.alert('Error', 'Failed to approve');
      }
  };

  const handleReject = async (id: string) => {
      Alert.alert('Delete', 'Are you sure you want to delete this suggestion?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: async () => {
              try {
                  await rejectSuggestion(id);
                  setSuggestions(prev => prev.filter(s => s.id !== id));
              } catch (error) {
                  Alert.alert('Error', 'Failed to delete');
              }
          }}
      ]);
  };

  const renderItem = ({ item }: { item: Suggestion }) => {
    const hasVoted = item.votedBy?.includes(user?.uid || '');
    const isApproved = item.status === 'approved';

    return (
      <View className={`p-4 rounded-2xl mb-3 border shadow-sm ${isApproved ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'}`}>
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-4">
              <Text className="text-gray-900 font-semibold text-lg">
                {item.text}
              </Text>
              <Text className="text-gray-500 text-xs mt-1">
                Suggested by {item.suggestedBy?.name || 'Unknown'} • {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-2 border-t border-gray-100 pt-2">
           {isApproved ? (
               <View className="flex-row items-center">
                   <View className="bg-green-200 px-2 py-1 rounded-full flex-row items-center mr-2">
                       <Check size={12} color="#166534" />
                       <Text className="text-green-800 text-xs font-bold ml-1">Approved</Text>
                   </View>
                   <TouchableOpacity onPress={() => handleReject(item.id)} className="p-2">
                       <Trash size={16} color="#EF4444" />
                   </TouchableOpacity>
               </View>
           ) : (
             <View className="flex-row items-center justify-between w-full">
                <TouchableOpacity
                    onPress={() => handleVote(item)}
                    className={`flex-row items-center px-3 py-1.5 rounded-full border mr-2 ${
                    hasVoted
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-white border-gray-200'
                    }`}
                >
                    <ThumbsUp
                    size={14}
                    color={hasVoted ? '#4F46E5' : '#6B7280'}
                    fill={hasVoted ? '#4F46E5' : 'transparent'}
                    />
                    <Text className={`ml-1.5 font-bold text-sm ${hasVoted ? 'text-indigo-600' : 'text-gray-600'}`}>
                    {item.votes || 0}
                    </Text>
                </TouchableOpacity>

                <View className="flex-row">
                    <TouchableOpacity onPress={() => handleApprove(item.id)} className="p-2 mr-1 bg-gray-50 rounded-full">
                        <Check size={18} color="#16A34A" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleReject(item.id)} className="p-2 bg-gray-50 rounded-full">
                        <X size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
             </View>
           )}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="p-4 bg-white border-b border-gray-100">
          <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
              <TextInput
                  placeholder="I want to eat..."
                  value={newSuggestion}
                  onChangeText={setNewSuggestion}
                  className="flex-1 mr-2 h-10 text-base"
                  returnKeyType="done"
                  onSubmitEditing={handleAddSuggestion}
              />
              <TouchableOpacity
                  onPress={handleAddSuggestion}
                  disabled={!newSuggestion.trim() || adding}
                  className={`p-2 rounded-full ${!newSuggestion.trim() ? 'bg-gray-200' : 'bg-indigo-600'}`}
              >
                  {adding ? (
                      <ActivityIndicator size="small" color="white" />
                  ) : (
                      <Plus size={20} color="white" />
                  )}
              </TouchableOpacity>
          </View>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-gray-400">No suggestions yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
