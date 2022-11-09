" Symbol Overrides
sign define DiagnosticSignInformation text=@ texthl=Label linehl= numhl=Label
sign define DiagnosticSignHint text=> texthl=Label linehl= numhl=Label
sign define DiagnosticSignWarn text=* texthl=Label linehl= numhl=Label
sign define DiagnosticSignError text=! texthl=Error linehl= numhl=Error

" Color overrides
hi link DiagnosticFloatingError WarningMsg
hi link DiagnosticFloatingWarning Label
hi link DiagnosticFloatingHint Label
hi link DiagnosticFloatingInformation Label
hi link DiagnosticVirtualTextError ErrorMsg
hi link DiagnosticVirtualTextWarning Label
hi link DiagnosticVirtualTextHint Label
hi link DiagnosticVirtualTextInformation Label
