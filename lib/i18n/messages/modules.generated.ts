import type { ModuleMessagesByArea } from '../module-messages';

export const moduleMessagesByArea: ModuleMessagesByArea = {
  "global": {
    "en": {
      "mod.commerce.one-time-payments": {
        "products": {
          "catalog": {
            "eyebrow": "One-time products",
            "title": "Products",
            "description": "Baseline storefront for one-time purchases connected to core checkout.",
            "empty": "No published one-time products are available.",
            "noDescription": "No description.",
            "inCartLabel": "In cart",
            "addToCart": "Add to cart",
            "buyNow": "Buy now",
            "viewCart": "View cart"
          },
          "cart": {
            "title": "Cart",
            "missingDescription": "Select a product from the catalog before continuing to order.",
            "browseProducts": "Browse products",
            "eyebrow": "Cart",
            "unitPriceLabel": "Unit price",
            "quantityLabel": "Quantity",
            "totalLabel": "Total",
            "mixedCurrencyWarning": "Mixed currencies detected in cart. Use one currency per checkout order.",
            "unavailableItemsWarning": "Some cart items are no longer available and were removed automatically.",
            "continueToOrder": "Continue to order",
            "backToProducts": "Back to products"
          },
          "order": {
            "title": "Order",
            "missingDescription": "Select a product before creating an order.",
            "browseProducts": "Browse products",
            "eyebrow": "Order",
            "description": "This baseline flow creates a module one-time intent and redirects to core checkout.",
            "unitPriceLabel": "Unit price",
            "quantityLabel": "Quantity",
            "totalLabel": "Total",
            "targetLabel": "Target",
            "targetTeamLabel": "Team",
            "targetUserLabel": "User",
            "continueToCheckout": "Continue to checkout",
            "backToCart": "Back to cart",
            "oneTimeDescription": "One-time order",
            "mixedCurrencyWarning": "Mixed currencies detected in cart. Remove incompatible products before continuing to checkout.",
            "unavailableItemsWarning": "Some cart items are no longer available and were removed automatically.",
            "switchedToUserWarning": "No team membership found for this account. The checkout target was switched to user automatically.",
            "errors": {
              "invalid_product_id": "The selected product is invalid.",
              "target_team_required": "You need an active team membership before starting checkout.",
              "product_not_found": "The selected product was not found.",
              "product_not_published": "The selected product is not published.",
              "one_time_only_product_required": "The selected product is not available for one-time checkout.",
              "product_missing_active_price": "The selected product has no active price.",
              "target_team_forbidden": "You cannot create an order for the selected team.",
              "operation_failed": "Unable to start checkout for this order."
            }
          }
        }
      }
    },
    "es": {
      "mod.commerce.one-time-payments": {
        "products": {
          "catalog": {
            "eyebrow": "Productos de pago unico",
            "title": "Productos",
            "description": "Catalogo base para compras de pago unico conectado al checkout core.",
            "empty": "No hay productos one_time publicados.",
            "noDescription": "Sin descripcion.",
            "inCartLabel": "En carrito",
            "addToCart": "Agregar al carrito",
            "buyNow": "Comprar ahora",
            "viewCart": "Ver carrito"
          },
          "cart": {
            "title": "Carrito",
            "missingDescription": "Selecciona un producto del catalogo antes de continuar al pedido.",
            "browseProducts": "Ver productos",
            "eyebrow": "Carrito",
            "unitPriceLabel": "Precio unitario",
            "quantityLabel": "Cantidad",
            "totalLabel": "Total",
            "mixedCurrencyWarning": "Se detectaron monedas mixtas en el carrito. Usa una sola moneda por orden de checkout.",
            "unavailableItemsWarning": "Algunos productos del carrito ya no estan disponibles y se eliminaron automaticamente.",
            "continueToOrder": "Continuar al pedido",
            "backToProducts": "Volver a productos"
          },
          "order": {
            "title": "Pedido",
            "missingDescription": "Selecciona un producto antes de crear un pedido.",
            "browseProducts": "Ver productos",
            "eyebrow": "Pedido",
            "description": "Este flujo base crea un intent one_time del modulo y redirige al checkout core.",
            "unitPriceLabel": "Precio unitario",
            "quantityLabel": "Cantidad",
            "totalLabel": "Total",
            "targetLabel": "Destino",
            "targetTeamLabel": "Equipo",
            "targetUserLabel": "Usuario",
            "continueToCheckout": "Continuar al checkout",
            "backToCart": "Volver al carrito",
            "oneTimeDescription": "Pedido one_time",
            "mixedCurrencyWarning": "Se detectaron monedas mixtas en el carrito. Quita productos incompatibles antes de continuar al checkout.",
            "unavailableItemsWarning": "Algunos productos del carrito ya no estan disponibles y se eliminaron automaticamente.",
            "switchedToUserWarning": "No se encontro membresia de equipo para esta cuenta. El destino del checkout cambio automaticamente a usuario.",
            "errors": {
              "invalid_product_id": "El producto seleccionado no es valido.",
              "target_team_required": "Necesitas una membresia activa de equipo antes de iniciar checkout.",
              "product_not_found": "No se encontro el producto seleccionado.",
              "product_not_published": "El producto seleccionado no esta publicado.",
              "one_time_only_product_required": "El producto seleccionado no esta disponible para checkout one_time.",
              "product_missing_active_price": "El producto seleccionado no tiene precio activo.",
              "target_team_forbidden": "No puedes crear un pedido para el equipo seleccionado.",
              "operation_failed": "No fue posible iniciar checkout para este pedido."
            }
          }
        }
      }
    }
  },
  "dashboard": {
    "en": {
      "mod.example.dashboard": {
        "title": "Example Dashboard",
        "nav": {
          "label": "Example Dashboard"
        }
      }
    },
    "es": {
      "mod.example.dashboard": {
        "title": "Dashboard de Ejemplo",
        "nav": {
          "label": "Dashboard de Ejemplo"
        }
      }
    }
  },
  "admin": {
    "en": {
      "mod.commerce.products": {
        "products": {
          "page": {
            "list": {
              "eyebrow": "Commerce products",
              "title": "Products",
              "description": "Admin management for subscription and one-time catalog products.",
              "createLabel": "Create product",
              "filterPlaceholder": "Search products...",
              "empty": "No products found."
            },
            "create": {
              "title": "Create Product",
              "description": "Create a catalog product for subscription or one-time checkout.",
              "submitLabel": "Create product",
              "backLabel": "Back"
            },
            "edit": {
              "titlePrefix": "Edit Product #",
              "description": "Update product fields and publication state.",
              "submitLabel": "Save changes",
              "backLabel": "Back"
            },
            "notFound": {
              "title": "Product Not Found",
              "descriptionTemplate": "Product id {productId} was not found.",
              "backLabel": "Back to products"
            }
          },
          "filters": {
            "kindLabel": "Kind",
            "publicationLabel": "Publication",
            "allLabel": "All",
            "subscriptionLabel": "subscription",
            "oneTimeLabel": "one_time",
            "publishedLabel": "published",
            "draftLabel": "draft",
            "applyLabel": "Apply",
            "resetLabel": "Reset"
          },
          "table": {
            "idHeader": "Id",
            "keyHeader": "Key",
            "nameHeader": "Name",
            "kindHeader": "Kind",
            "priceHeader": "Price",
            "stateHeader": "State",
            "updatedHeader": "Updated",
            "actionsHeader": "Actions",
            "editLabel": "Edit",
            "publishLabel": "Publish",
            "unpublishLabel": "Unpublish"
          },
          "form": {
            "productKeyLabel": "Product key",
            "productKeyPlaceholder": "coffee-mug",
            "nameLabel": "Name",
            "descriptionLabel": "Description",
            "kindLabel": "Kind",
            "subscriptionTemplateIdLabel": "Subscription template id",
            "subscriptionTemplateIdHint": "Required only when kind is subscription.",
            "priceCurrencyLabel": "Price currency",
            "priceAmountLabel": "Price amount",
            "priceProviderLabel": "Price provider",
            "priceProviderPlaceholder": "stripe | paypal",
            "providerPriceIdLabel": "Provider price id"
          },
          "publication": {
            "title": "Publication",
            "currentStateLabel": "Current state"
          },
          "kind": {
            "subscription": "subscription",
            "oneTime": "one_time"
          },
          "state": {
            "published": "published",
            "draft": "draft"
          },
          "feedback": {
            "status": {
              "created": "Product created successfully.",
              "updated": "Product updated successfully.",
              "published": "Product published successfully.",
              "unpublished": "Product unpublished successfully."
            },
            "operationFailedTemplate": "Operation failed ({code}).",
            "errors": {
              "invalid_product_id": "Invalid product id.",
              "invalid_product_key": "Product key is required and must be slug-compatible.",
              "invalid_name": "Product name is required.",
              "invalid_kind": "Product type must be subscription or one_time.",
              "invalid_subscription_template_id": "Subscription template id must be a positive integer.",
              "invalid_price": "Price payload is invalid.",
              "invalid_price_currency": "Price currency must be a valid code.",
              "invalid_price_amount": "Price amount must be an integer >= 0.",
              "invalid_price_provider": "Price provider is invalid.",
              "invalid_price_provider_id": "Provider price id is invalid.",
              "one_time_price_required": "One-time products require an active price.",
              "price_not_allowed_for_subscription": "Price is not allowed for subscription products.",
              "subscription_template_required": "Subscription products require a subscription template id.",
              "subscription_template_not_found": "Subscription template was not found.",
              "subscription_template_not_allowed_for_one_time": "subscriptionTemplateId is not allowed for one_time products.",
              "duplicate_product_key": "Product key is already in use.",
              "one_time_product_missing_active_price": "Cannot publish one_time product without an active price.",
              "no_updates_provided": "No updates were provided.",
              "not_found": "Product was not found.",
              "operation_failed": "Operation failed. Try again."
            }
          }
        }
      },
      "mod.example.admin": {
        "title": "Example Admin",
        "nav": {
          "label": "Example Admin"
        }
      }
    },
    "es": {
      "mod.commerce.products": {
        "products": {
          "page": {
            "list": {
              "eyebrow": "Productos commerce",
              "title": "Productos",
              "description": "Gestion admin para productos de suscripcion y pago unico.",
              "createLabel": "Crear producto",
              "filterPlaceholder": "Buscar productos...",
              "empty": "No hay productos."
            },
            "create": {
              "title": "Crear producto",
              "description": "Crea un producto de catalogo para suscripcion o pago unico.",
              "submitLabel": "Crear producto",
              "backLabel": "Volver"
            },
            "edit": {
              "titlePrefix": "Editar producto #",
              "description": "Actualiza campos del producto y estado de publicacion.",
              "submitLabel": "Guardar cambios",
              "backLabel": "Volver"
            },
            "notFound": {
              "title": "Producto no encontrado",
              "descriptionTemplate": "No se encontro el producto id {productId}.",
              "backLabel": "Volver a productos"
            }
          },
          "filters": {
            "kindLabel": "Tipo",
            "publicationLabel": "Publicacion",
            "allLabel": "Todos",
            "subscriptionLabel": "suscripcion",
            "oneTimeLabel": "one_time",
            "publishedLabel": "publicado",
            "draftLabel": "borrador",
            "applyLabel": "Aplicar",
            "resetLabel": "Limpiar"
          },
          "table": {
            "idHeader": "Id",
            "keyHeader": "Clave",
            "nameHeader": "Nombre",
            "kindHeader": "Tipo",
            "priceHeader": "Precio",
            "stateHeader": "Estado",
            "updatedHeader": "Actualizado",
            "actionsHeader": "Acciones",
            "editLabel": "Editar",
            "publishLabel": "Publicar",
            "unpublishLabel": "Despublicar"
          },
          "form": {
            "productKeyLabel": "Clave de producto",
            "productKeyPlaceholder": "coffee-mug",
            "nameLabel": "Nombre",
            "descriptionLabel": "Descripcion",
            "kindLabel": "Tipo",
            "subscriptionTemplateIdLabel": "Id plantilla de suscripcion",
            "subscriptionTemplateIdHint": "Requerido solo cuando el tipo es suscripcion.",
            "priceCurrencyLabel": "Moneda del precio",
            "priceAmountLabel": "Monto",
            "priceProviderLabel": "Proveedor de precio",
            "priceProviderPlaceholder": "stripe | paypal",
            "providerPriceIdLabel": "Id de precio del proveedor"
          },
          "publication": {
            "title": "Publicacion",
            "currentStateLabel": "Estado actual"
          },
          "kind": {
            "subscription": "suscripcion",
            "oneTime": "one_time"
          },
          "state": {
            "published": "publicado",
            "draft": "borrador"
          },
          "feedback": {
            "status": {
              "created": "Producto creado correctamente.",
              "updated": "Producto actualizado correctamente.",
              "published": "Producto publicado correctamente.",
              "unpublished": "Producto despublicado correctamente."
            },
            "operationFailedTemplate": "Operacion fallida ({code}).",
            "errors": {
              "invalid_product_id": "Id de producto invalido.",
              "invalid_product_key": "La clave de producto es obligatoria y debe ser tipo slug.",
              "invalid_name": "El nombre del producto es obligatorio.",
              "invalid_kind": "El tipo debe ser subscription o one_time.",
              "invalid_subscription_template_id": "El id de plantilla de suscripcion debe ser entero positivo.",
              "invalid_price": "El payload de precio es invalido.",
              "invalid_price_currency": "La moneda del precio es invalida.",
              "invalid_price_amount": "El monto del precio debe ser entero mayor o igual a 0.",
              "invalid_price_provider": "El proveedor de precio es invalido.",
              "invalid_price_provider_id": "El id de precio del proveedor es invalido.",
              "one_time_price_required": "Los productos one_time requieren un precio activo.",
              "price_not_allowed_for_subscription": "El precio no esta permitido para productos subscription.",
              "subscription_template_required": "Los productos subscription requieren subscriptionTemplateId.",
              "subscription_template_not_found": "No se encontro la plantilla de suscripcion.",
              "subscription_template_not_allowed_for_one_time": "subscriptionTemplateId no esta permitido para one_time.",
              "duplicate_product_key": "La clave de producto ya esta en uso.",
              "one_time_product_missing_active_price": "No se puede publicar one_time sin precio activo.",
              "no_updates_provided": "No se enviaron cambios.",
              "not_found": "Producto no encontrado.",
              "operation_failed": "Operacion fallida. Intenta de nuevo."
            }
          }
        }
      },
      "mod.example.admin": {
        "title": "Admin de Ejemplo",
        "nav": {
          "label": "Admin de Ejemplo"
        }
      }
    }
  },
  "login": {}
};
