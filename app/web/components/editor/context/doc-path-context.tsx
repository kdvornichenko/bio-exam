'use client'

import { createContext, useContext } from 'react'

type DocPathContextType = {
	docPath?: string
}

const DocPathContext = createContext<DocPathContextType>({})

export function DocPathProvider({ docPath, children }: { docPath?: string; children: React.ReactNode }) {
	return <DocPathContext.Provider value={{ docPath }}>{children}</DocPathContext.Provider>
}

export function useDocPath() {
	return useContext(DocPathContext)
}
