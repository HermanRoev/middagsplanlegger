import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth';
import { getInboxMeals, voteForMeal } from '../../../lib/api';
import { Suggestion } from '../../../../src/types';
import { ThumbsUp, Check, X } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';

export default function Inbox() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInbox();
  }, [user]);

  async function fetchInbox() {
    if (!user) return;
    try {
      const data = await getInboxMeals();
      // Filter for pending only
      setSuggestions(data.filter(s => s.status === 'pending'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleVote = async (suggestion: Suggestion) => {
    if (!user) return;
    try {
      // Toggle logic handled in API or client?
      // The web app toggles. If user is in votedBy, remove them. Else add.
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

  const renderItem = ({ item }: { item: Suggestion }) => {
    const hasVoted = item.votedBy?.includes(user?.uid || '');

    return (
      <View className="bg-white p-4 rounded-2xl mb-3 border border-gray-100 shadow-sm">
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-gray-900 font-semibold text-lg flex-1 mr-4">
            {item.text}
          </Text>
          <View className="bg-gray-100 px-2 py-1 rounded text-xs">
            <Text className="text-gray-500 text-xs">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-gray-500 text-sm">
            Suggested by {item.suggestedBy?.name || 'Unknown'}
          </Text>

          <TouchableOpacity
            onPress={() => handleVote(item)}
            className={`flex-row items-center px-4 py-2 rounded-full border ${
              hasVoted
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-white border-gray-200'
            }`}
          >
            <ThumbsUp
              size={16}
              color={hasVoted ? '#4F46E5' : '#6B7280'}
              fill={hasVoted ? '#4F46E5' : 'transparent'}
            />
            <Text className={`ml-2 font-bold ${hasVoted ? 'text-indigo-600' : 'text-gray-600'}`}>
              {item.votes || 0}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
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
              <Text className="text-gray-400">No pending suggestions.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
