'use client'

import { useState, useEffect, FormEvent, useMemo } from 'react'
import { CupboardItem } from '@/types'
import {
  getCupboardItems,
  addCupboardItem,
  updateCupboardItem,
  deleteCupboardItem,
} from '@/lib/cupboard'
import {
  getAllIngredients,
  MasterIngredient,
  addIngredientToMasterList,
} from '@/lib/ingredients'
import { Modal } from './Modal'
import toast from 'react-hot-toast'
import { useDebounce } from '@/hooks/useDebounce'

const initialFormState: Omit<CupboardItem, 'id' | 'userId'> = {
  ingredientName: '',
  unit: 'stk',
  amount: 0,
  wantedAmount: 1,
  threshold: 0,
}

export function CupboardView() {
  const [items, setItems] = useState<CupboardItem[]>([])
  const [masterIngredients, setMasterIngredients] = useState<
    MasterIngredient[]
  >([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] =
    useState<Omit<CupboardItem, 'id' | 'userId'>>(initialFormState)
  const [editingItem, setEditingItem] = useState<CupboardItem | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [showBelowThresholdOnly, setShowBelowThresholdOnly] = useState(false)
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>(
    []
  )

  const debouncedSearchTerm = useDebounce(formData.ingredientName, 300)

  const fetchAllData = async () => {
    try {
      setIsLoading(true)
      const [cupboardItems, ingredients] = await Promise.all([
        getCupboardItems(),
        getAllIngredients(),
      ])
      setItems(cupboardItems)
      setMasterIngredients(ingredients)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Could not fetch all necessary data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  useEffect(() => {
    if (debouncedSearchTerm) {
      const cupboardIngredientNames = new Set(items.map((i) => i.ingredientName.toLowerCase()))
      const suggestions = masterIngredients
        .map((i) => i.id)
        .filter(
          (name) =>
            !cupboardIngredientNames.has(name.toLowerCase()) &&
            name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
        )
      setIngredientSuggestions(suggestions)
    } else {
      setIngredientSuggestions([])
    }
  }, [debouncedSearchTerm, masterIngredients, items])

  const handleOpenModal = (item: CupboardItem | null = null) => {
    if (item) {
      setEditingItem(item)
      setFormData(item)
    } else {
      setEditingItem(null)
      setFormData(initialFormState)
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
    setFormData(initialFormState)
    setIngredientSuggestions([])
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'ingredientName' ? value : parseFloat(value) || 0,
    }))
  }

  const handleSuggestionClick = (name: string) => {
    setFormData((prev) => ({ ...prev, ingredientName: name }))
    setIngredientSuggestions([])
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!formData.ingredientName) {
      toast.error('Ingredient name cannot be empty.')
      return
    }

    const toastId = toast.loading(
      editingItem ? 'Updating item...' : 'Adding item...'
    )

    try {
      // If it's a new ingredient, add it to the master list
      const isNewIngredient = !masterIngredients.some(
        (i) => i.id.toLowerCase() === formData.ingredientName.toLowerCase()
      )
      if (isNewIngredient) {
        await addIngredientToMasterList(formData.ingredientName)
      }

      if (editingItem) {
        await updateCupboardItem(editingItem.id, {
          amount: formData.amount,
          wantedAmount: formData.wantedAmount,
          threshold: formData.threshold,
          unit: formData.unit,
          ingredientName: formData.ingredientName,
        })
        toast.success('Item updated!', { id: toastId })
      } else {
        const isDuplicate = items.some(
          (item) => item.ingredientName.toLowerCase() === formData.ingredientName.toLowerCase()
        )
        if (isDuplicate) {
          toast.error('This item is already in your Matlager. Please edit the existing item.', { id: toastId })
          return
        }
        await addCupboardItem(formData)
        toast.success('Item added!', { id: toastId })
      }
      handleCloseModal()
      fetchAllData() // Refresh both cupboard and master list
    } catch (error) {
      console.error('Error saving item:', error)
      toast.error('An error occurred.', { id: toastId })
    }
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      const toastId = toast.loading('Deleting item...')
      try {
        await deleteCupboardItem(id)
        toast.success('Item deleted!', { id: toastId })
        fetchAllData()
      } catch (error) {
        console.error('Error deleting item:', error)
        toast.error('An error occurred.', { id: toastId })
      }
    }
  }

  const handleSetToEmpty = async (item: CupboardItem) => {
    const toastId = toast.loading('Setting item to empty...')
    try {
      await updateCupboardItem(item.id, { amount: 0 })
      toast.success('Item set to empty!', { id: toastId })
      fetchAllData()
    } catch (error) {
      console.error('Error setting item to empty:', error)
      toast.error('An error occurred.', { id: toastId })
    }
  }

  const filteredItems = useMemo(() => {
    return items
      .filter((item) =>
        item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter((item) =>
        showBelowThresholdOnly ? item.amount <= item.threshold : true
      )
  }, [items, searchTerm, showBelowThresholdOnly])

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <p>Loading Matlager...</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg w-full">
      <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800">Matlager</h2>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBelowThresholdOnly}
              onChange={(e) => setShowBelowThresholdOnly(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Show low stock only</span>
          </label>
          <button
            onClick={() => handleOpenModal()}
            className="w-full md:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="material-icons text-base align-middle">add</span>
            Add New Item
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-gray-600">
          {items.length === 0
            ? 'Your Matlager is empty. Add items to get started.'
            : 'No items match your search or filter.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Quantity
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Wanted
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Threshold
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-3 px-4 capitalize">
                    {item.ingredientName}
                  </td>
                  <td
                    className={`py-3 px-4 ${
                      item.amount <= item.threshold ? 'text-red-500 font-bold' : ''
                    }`}
                  >
                    {item.amount} {item.unit}
                  </td>
                  <td className="py-3 px-4">
                    {item.wantedAmount} {item.unit}
                  </td>
                  <td className="py-3 px-4">
                    {item.threshold} {item.unit}
                  </td>
                  <td className="py-3 px-4 flex items-center gap-4">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      title="Edit"
                    >
                      <span className="material-icons">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      <span className="material-icons">delete</span>
                    </button>
                    <button
                      onClick={() => handleSetToEmpty(item)}
                      className="p-1 text-yellow-600 hover:text-yellow-800"
                      title="Set to Empty"
                    >
                      <span className="material-icons">delete_sweep</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label
              htmlFor="ingredientName"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              type="text"
              name="ingredientName"
              id="ingredientName"
              value={formData.ingredientName}
              onChange={handleFormChange}
              required
              autoComplete="off"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={!!editingItem}
            />
            {ingredientSuggestions.length > 0 && !editingItem && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-auto">
                {ingredientSuggestions.map((name) => (
                  <li
                    key={name}
                    onClick={() => handleSuggestionClick(name)}
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700"
            >
              Current Quantity
            </label>
            <input
              type="number"
              name="amount"
              id="amount"
              value={formData.amount}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="unit"
              className="block text-sm font-medium text-gray-700"
            >
              Unit
            </label>
            <select
              name="unit"
              id="unit"
              value={formData.unit}
              onChange={handleFormChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="dl">dl</option>
              <option value="stk">stk</option>
              <option value="ts">ts</option>
              <option value="ss">ss</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="wantedAmount"
              className="block text-sm font-medium text-gray-700"
            >
              Wanted Quantity
            </label>
            <input
              type="number"
              name="wantedAmount"
              id="wantedAmount"
              value={formData.wantedAmount}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="threshold"
              className="block text-sm font-medium text-gray-700"
            >
              Warning Threshold
            </label>
            <input
              type="number"
              name="threshold"
              id="threshold"
              value={formData.threshold}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleCloseModal}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-md hover:bg-gray-300 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700"
            >
              {editingItem ? 'Save Changes' : 'Add'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
