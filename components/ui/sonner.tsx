"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--papel)",
          "--normal-text": "var(--tinta)",
          "--normal-border": "var(--caliza)",
          "--success-bg": "var(--papel-alt)",
          "--success-text": "var(--mezquite-oscuro)",
          "--success-border": "var(--mezquite-oscuro)",
          "--warning-bg": "var(--papel-alt)",
          "--warning-text": "var(--terracota)",
          "--warning-border": "var(--terracota)",
          "--error-bg": "var(--rojo-alerta-bg)",
          "--error-text": "var(--rojo-alerta)",
          "--error-border": "var(--rojo-alerta)",
          "--border-radius": "0",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
