-- Abstract:
-- Setup of the native Neovim LSP and Diagnostics

-- LSP setup
-- Customise diagnostic handler
vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
vim.lsp.diagnostic.on_publish_diagnostics, {
        underline = true,
        virtual_text = {
            spacing = 8
        },
        signs = true,
        -- Don't update diagnostics during insert mode, it makes things very noisy
        update_in_insert = false,
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
    component_separator = '  ',
    indicator_errors = ' ',
    indicator_warnings = " ",
    indicator_info = "✱ ",
    indicator_hint = "✦ ",
    indicator_ok = '✓ Ok',
    spinner_frames = {'⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'},
    status_symbol = '',
    select_symbol = nil,
    update_interval = 500
})
lsp_status.register_progress()

local on_attach = function(client, bufnr)
  -- LSP status bar
  lsp_status.on_attach(client)

  -- Highlight matching references to word using the LSP
  if client.server_capabilities.documentHighlightProvider then
    vim.api.nvim_exec([[
      augroup lsp_document_highlight
        autocmd! * <buffer>
        autocmd CursorHold <buffer> lua vim.lsp.buf.document_highlight()
        autocmd CursorMoved <buffer> lua vim.lsp.buf.clear_references()
      augroup END
    ]], false)
  end

  -- Mappings
  local bufopts = { noremap=true, silent=true, buffer=bufnr }
  vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, bufopts)
  vim.keymap.set('n', 'gd', vim.lsp.buf.definition, bufopts)
  vim.keymap.set('n', 'K', vim.lsp.buf.hover, bufopts)
  vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, bufopts)
  vim.keymap.set('n', '<C-k>', vim.lsp.buf.signature_help, bufopts)
  vim.keymap.set('n', '<space>wa', vim.lsp.buf.add_workspace_folder, bufopts)
  vim.keymap.set('n', '<space>wr', vim.lsp.buf.remove_workspace_folder, bufopts)
  vim.keymap.set('n', '<space>wl', function()
    print(vim.inspect(vim.lsp.buf.list_workspace_folders()))
  end, bufopts)
  vim.keymap.set('n', '<space>D', vim.lsp.buf.type_definition, bufopts)
  vim.keymap.set('n', '<space>r', vim.lsp.buf.rename, bufopts)
  vim.keymap.set('n', '<C-s>', vim.lsp.buf.code_action, bufopts)
  vim.keymap.set('n', 'gr', vim.lsp.buf.references, bufopts)
  vim.keymap.set('n', '<space>e', vim.diagnostic.open_float, bufopts)
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev, bufopts)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next, bufopts)
  vim.keymap.set('n', '<space>q', vim.diagnostic.setloclist, bufopts)
end

-- LANG SERVER CONFIGS
local util = require "lspconfig/util"
local lspconfig = require('lspconfig')
local cmp_nvim = require('cmp_nvim_lsp')
function default_capabilities()
    return cmp_nvim.default_capabilities()
end

local clang_capabilties = default_capabilities()
-- https://github.com/jose-elias-alvarez/null-ls.nvim/issues/428#issuecomment-997226723
clang_capabilties.offsetEncoding = { 'utf-16' }
lspconfig.clangd.setup { 
    handlers = lsp_status.extensions.clangd.setup(),
    capabilities = clang_capabilties,
    on_attach = on_attach,
}

lspconfig.pyright.setup {
    capabilities = default_capabilities(),
    on_attach = on_attach
}

lspconfig.sourcekit.setup { 
    capabilities = default_capabilities(),
    on_attach = on_attach
}

lspconfig.rust_analyzer.setup { 
    capabilities = default_capabilities(),
    flags = {
      debounce_text_changes = 150,
    },
    settings = {
      ["rust-analyzer"] = {
        checkOnSave = true,
        cargo = {
          allFeatures = true,
        },
      },
    },
    on_attach = on_attach,
}

lspconfig.denols.setup {
    on_attach = on_attach,
    capabilities = default_capabilities(),
    root_dir = lspconfig.util.root_pattern("deno.json", "deno.jsonc"),
}

lspconfig.ts_ls.setup {
    capabilities = default_capabilities(),
    root_dir = lspconfig.util.root_pattern("package.json"),
    single_file_support = false,
    on_attach = function(client, buf)
        -- we use null-ls to format, not tsserver
        client.server_capabilities.documentFormattingProvider = false
        client.server_capabilities.documentRangeFormattingProvider = false
        on_attach(client, buf)
    end
}

lspconfig.gopls.setup {
    capabilities = default_capabilities(),
    on_attach = on_attach,
    cmd = {"gopls", "serve"},
    filetypes = {"go", "gomod"},
    root_dir = util.root_pattern("go.work", "go.mod", ".git"),
    settings = {
      gopls = {
        analyses = {
          unusedparams = true,
        },
        staticcheck = true,
      },
    },
}
