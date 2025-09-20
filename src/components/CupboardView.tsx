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
import InputField from './ui/InputField'

const initialFormState: Omit<CupboardItem, 'id' | 'userId'> = {
  ingredientName: '',
  unit: 'stk',
  amount: null,
  wantedAmount: null,
  threshold: null,
}

const units = [
  { value: 'g', label: 'gram' },
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'liter' },
  { value: 'dl', label: 'dl' },
  { value: 'stk', label: 'stk' },
  { value: 'ts', label: 'ts' },
  { value: 'ss', label: 'ss' },
]

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

  const availableIngredients = useMemo(() => {
    const cupboardIngredientNames = new Set(
      items.map((i) => i.ingredientName.toLowerCase())
    )
    return masterIngredients.filter(
      (ing) => !cupboardIngredientNames.has(ing.id.toLowerCase())
    )
  }, [items, masterIngredients])

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
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    const isNumeric = ['amount', 'wantedAmount', 'threshold'].includes(name)
    setFormData((prev) => ({
      ...prev,
      [name]: isNumeric ? Number(value) || null : value,
    }))
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
      const isNewToMasterList = !masterIngredients.some(
        (i) => i.id.toLowerCase() === formData.ingredientName.toLowerCase()
      )
      if (isNewToMasterList) {
        await addIngredientToMasterList(formData.ingredientName)
      }

      if (editingItem) {
        await updateCupboardItem(editingItem.id, {
          amount: formData.amount,
          wantedAmount: formData.wantedAmount,
          threshold: formData.threshold,
          unit: formData.unit,
        })
        toast.success('Item updated!', { id: toastId })
      } else {
        const isDuplicate = items.some(
          (item) =>
            item.ingredientName.toLowerCase() ===
            formData.ingredientName.toLowerCase()
        )
        if (isDuplicate) {
          toast.error(
            'This item is already in your Matlager. Please edit the existing item.',
            { id: toastId }
          )
          return
        }
        await addCupboardItem(formData)
        toast.success('Item added!', { id: toastId })
      }
      handleCloseModal()
      fetchAllData()
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
        showBelowThresholdOnly
          ? (item.amount ?? 0) <= (item.threshold ?? 0)
          : true
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
    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col w-full">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Matlager</h1>
        <p className="text-gray-600 mt-1">
          Hold oversikt over ingrediensene du har på kjøkkenet.
        </p>
      </header>

      <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-grow w-full md:max-w-md">
          <InputField
            id="item-search"
            label="Søk i matlager..."
            icon="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showBelowThresholdOnly}
            onChange={(e) => setShowBelowThresholdOnly(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700">Vis varer med lavt lager</span>
        </label>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-shadow flex items-center gap-2"
        >
          <span className="material-icons text-base align-middle">add</span>
          Legg til vare
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center text-gray-500 mt-12">
          <p className="text-lg">
            {items.length === 0
              ? 'Ditt matlager er tomt.'
              : 'Ingen varer passer søket ditt.'}
          </p>
          <p>Klikk på "Legg til vare" for å starte.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">
                  Navn
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">
                  Mengde
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">
                  Ønsket
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">
                  Terskel
                </th>
                <th className="text-left py-3 px-4 font-semibold text-sm text-gray-600 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 capitalize">
                    {item.ingredientName}
                  </td>
                  <td
                    className={`py-4 px-4 ${
                      (item.amount ?? 0) <= (item.threshold ?? 0)
                        ? 'text-red-500 font-bold'
                        : ''
                    }`}
                  >
                    {item.amount ?? 0} {item.unit}
                  </td>
                  <td className="py-4 px-4">
                    {item.wantedAmount ?? 0} {item.unit}
                  </td>
                  <td className="py-4 px-4">
                    {item.threshold ?? 0} {item.unit}
                  </td>
                  <td className="py-4 px-4 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                      title="Rediger"
                    >
                      <span className="material-icons text-base">edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100"
                      title="Slett"
                    >
                      <span className="material-icons text-base">delete</span>
                    </button>
                    <button
                      onClick={() => handleSetToEmpty(item)}
                      className="p-2 text-gray-500 hover:text-yellow-600 rounded-full hover:bg-gray-100"
                      title="Sett til tom"
                    >
                      <span className="material-icons text-base">
                        delete_sweep
                      </span>
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
        title={editingItem ? 'Rediger vare' : 'Legg til ny vare i Matlager'}
      >
        <form onSubmit={handleSubmit} className="space-y-8 py-4">
          <div className="space-y-6">
            <InputField
              id="ingredientName"
              name="ingredientName"
              label="Navn på vare"
              type="text"
              value={formData.ingredientName}
              onChange={handleFormChange}
              list="available-ingredients"
              disabled={!!editingItem}
              required
            />
            <datalist id="available-ingredients">
              {availableIngredients.map((ing) => (
                <option key={ing.id} value={ing.id} />
              ))}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                id="amount"
                name="amount"
                label="Nåværende mengde"
                type="number"
                value={formData.amount ?? ''}
                onChange={handleFormChange}
                required
              />
              <div className="flex items-end">
                <label
                  htmlFor="unit"
                  className="block text-sm font-medium text-gray-700 mb-1 sr-only"
                >
                  Enhet
                </label>
                <select
                  name="unit"
                  id="unit"
                  value={formData.unit}
                  onChange={handleFormChange}
                  className="w-full h-[50px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  {units.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                id="wantedAmount"
                name="wantedAmount"
                label="Ønsket mengde"
                type="number"
                value={formData.wantedAmount ?? ''}
                onChange={handleFormChange}
              />
              <InputField
                id="threshold"
                name="threshold"
                label="Terskel for varsel"
                type="number"
                value={formData.threshold ?? ''}
                onChange={handleFormChange}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-6 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-shadow"
            >
              {editingItem ? 'Lagre endringer' : 'Legg til i matlager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
