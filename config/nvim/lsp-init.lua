-- Abstract:
-- Setup of the native Neovim LSP
-- Called from `init.vim`

-- LSP setup
-- Customise diagnostic handler
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
vim.lsp.diagnostic.on_publish_diagnostics, {
        -- Enable underline, use default values
        underline = false,
        -- Enable virtual text, override spacing to 4
        virtual_text = {
            spacing = 8
        },
        signs = true,
        update_in_insert = true,
        -- Make the most serious diagnostic the one that is highlighted
        severity_sort = true,
    }
)
vim.lsp.handlers["textDocument/formatting"] = function(err, _, result, _, bufnr)
    if err ~= nil or result == nil then
        return
    end
    if not vim.api.nvim_buf_get_option(bufnr, "modified") then
        local view = vim.fn.winsaveview()
        vim.lsp.util.apply_text_edits(result, bufnr)
        vim.fn.winrestview(view)
        if bufnr == vim.api.nvim_get_current_buf() then
            vim.api.nvim_command("noautocmd :update")
        end
    end
end

local lsp_status = require('lsp-status') -- for status support
lsp_status.config({
    kind_labels = {},
    current_function = false,
    diagnostics = true,
    indicator_separator = '',
    component_separator = ' ',
    indicator_errors = 'E',
    indicator_warnings = 'W',
    indicator_info = 'i',
    indicator_hint = '*',
    indicator_ok = 'Ok',
    spinner_frames = {'⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'},
    status_symbol = '→',
    select_symbol = nil,
    update_interval = 100
  })
lsp_status.register_progress()

local nvim_lsp = require('lspconfig')

local on_attach = function(client, bufnr)
  local function buf_set_keymap(...) vim.api.nvim_buf_set_keymap(bufnr, ...) end
  local function buf_set_option(...) vim.api.nvim_buf_set_option(bufnr, ...) end

  buf_set_option('omnifunc', 'v:lua.vim.lsp.omnifunc')

  -- Nvim Compe does not have native signature completion
  -- we use 'ray-x/lsp_signature.nvim' to get this behaviour
  -- https://github.com/ray-x/lsp_signature.nvim#full-configuration
  require "lsp_signature".on_attach({
      bind = true, -- This is mandatory, otherwise border config won't get registered.
      hint_enable = false,
      floating_window = true,
      handler_opts = {
          border = "double"
      },
      decorator = {"**", "**"}
  })

  -- LSP status bar
  lsp_status.on_attach(client)

  -- Mappings
  local opts = { noremap=true, silent=true }
  buf_set_keymap('n', 'gD', '<Cmd>lua vim.lsp.buf.declaration()<CR>', opts)
  buf_set_keymap('n', 'gd', '<Cmd>lua vim.lsp.buf.definition()<CR>', opts)
  buf_set_keymap('n', 'K', '<Cmd>lua vim.lsp.buf.hover()<CR>', opts)
  buf_set_keymap('n', 'gi', '<cmd>lua vim.lsp.buf.implementation()<CR>', opts)
  buf_set_keymap('n', '<C-k>', '<cmd>lua vim.lsp.buf.signature_help()<CR>', opts)
  buf_set_keymap('n', '<space>wa', '<cmd>lua vim.lsp.buf.add_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<space>wr', '<cmd>lua vim.lsp.buf.remove_workspace_folder()<CR>', opts)
  buf_set_keymap('n', '<space>wl', '<cmd>lua print(vim.inspect(vim.lsp.buf.list_workspace_folders()))<CR>', opts)
  buf_set_keymap('n', '<space>D', '<cmd>lua vim.lsp.buf.type_definition()<CR>', opts)
  buf_set_keymap('n', '<space>rn', '<cmd>lua vim.lsp.buf.rename()<CR>', opts)
  buf_set_keymap('n', '<space>ca', '<cmd>lua vim.lsp.buf.code_action()<CR>', opts)
  buf_set_keymap('n', 'gr', '<cmd>lua vim.lsp.buf.references()<CR>', opts)
  buf_set_keymap('n', '<space>e', '<cmd>lua vim.lsp.diagnostic.show_line_diagnostics()<CR>', opts)
  buf_set_keymap('n', '[d', '<cmd>lua vim.lsp.diagnostic.goto_prev()<CR>', opts)
  buf_set_keymap('n', ']d', '<cmd>lua vim.lsp.diagnostic.goto_next()<CR>', opts)
  buf_set_keymap('n', '<space>q', '<cmd>lua vim.lsp.diagnostic.set_loclist()<CR>', opts)

  -- Set autocommands conditional on server_capabilities
  if client.resolved_capabilities.document_highlight then
    vim.api.nvim_exec([[
      hi LspReferenceRead cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      hi LspReferenceText cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      hi LspReferenceWrite cterm=bold ctermbg=white guibg=white ctermfg=black guifg=black
      augroup lsp_document_highlight
        autocmd! * <buffer>
        autocmd CursorHold <buffer> lua vim.lsp.buf.document_highlight()
        autocmd CursorMoved <buffer> lua vim.lsp.buf.clear_references()
      augroup END
    ]], false)
  end

  -- autoformat (e.g. prettier)
  if client.resolved_capabilities.document_formatting then
      vim.api.nvim_command [[augroup Format]]
      vim.api.nvim_command [[autocmd! * <buffer>]]
      vim.api.nvim_command [[autocmd BufWritePost <buffer> lua vim.lsp.buf.formatting()]]
      vim.api.nvim_command [[augroup END]]
  end

end

-- LANG SERVER CONFIGS

nvim_lsp.clangd.setup { 
    handlers = lsp_status.extensions.clangd.setup(),
    capabilities = lsp_status.capabilities,
  on_attach = on_attach
}

nvim_lsp.sourcekit.setup { 
    capabilities = lsp_status.capabilities,
  on_attach = on_attach
}

nvim_lsp.rust_analyzer.setup { 
    capabilities = lsp_status.capabilities,
  on_attach = on_attach
}

nvim_lsp.tsserver.setup {
    capabilities = lsp_status.capabilities,
    on_attach = function(client, buf)
        -- efm is used instead, so disable tsserver formatting ability
        client.resolved_capabilities.document_formatting = false
        on_attach(client, buf)
    end
}

-- efm is used to get linters into the native lang server
nvim_lsp.efm.setup {
    -- other config comes from .config/efm-langserver/config.yaml
    init_options = {
        documentFormatting = true,
        codeAction = true
    },
    filetypes = {
        "javascript",
        "typescript",
        "lua",
        "pug",
        "yaml"
    },
    on_attach = on_attach
}

