const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const StockMovement = require('../models/StockMovement');
const Client = require('../models/Client');
const Supplier = require('../models/Supplier');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

// @desc    Get stock valuation report
// @route   GET /api/reports/stock-valuation
// @access  Private
exports.getStockValuationReport = async (req, res, next) => {
  try {
    const { categoryId } = req.query;
    const query = { isArchived: false };

    if (categoryId) {
      query.category = categoryId;
    }

    const products = await Product.find(query)
      .populate('category', 'name')
      .sort({ name: 1 });

    const report = products.map(product => ({
      sku: product.sku,
      name: product.name,
      category: product.category?.name,
      unit: product.unit,
      currentStock: product.currentStock,
      averageCost: product.averageCost,
      totalValue: product.currentStock * product.averageCost
    }));

    const totalValue = report.reduce((sum, item) => sum + item.totalValue, 0);

    res.json({
      success: true,
      data: {
        items: report,
        summary: {
          totalProducts: report.length,
          totalValue
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales summary report
// @route   GET /api/reports/sales-summary
// @access  Private
exports.getSalesSummaryReport = async (req, res, next) => {
  try {
    const { startDate, endDate, clientId } = req.query;
    const query = { status: { $in: ['paid', 'partial'] } };

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    if (clientId) {
      query.client = clientId;
    }

    const invoices = await Invoice.find(query)
      .populate('client', 'name code')
      .populate('items.product', 'name sku')
      .sort({ invoiceDate: -1 });

    const summary = {
      totalInvoices: invoices.length,
      totalSales: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      totalDiscount: invoices.reduce((sum, inv) => sum + inv.totalDiscount, 0),
      totalTax: invoices.reduce((sum, inv) => sum + inv.totalTax, 0)
    };

    // Sales by product
    const productSales = {};
    invoices.forEach(invoice => {
      invoice.items.forEach(item => {
        const productId = item.product?._id?.toString();
        if (!productSales[productId]) {
          productSales[productId] = {
            product: item.product,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.total;
      });
    });

    res.json({
      success: true,
      data: {
        invoices,
        summary,
        productSales: Object.values(productSales)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product movement report
// @route   GET /api/reports/product-movement
// @access  Private
exports.getProductMovementReport = async (req, res, next) => {
  try {
    const { startDate, endDate, productId, type } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.movementDate = {};
      if (startDate) query.movementDate.$gte = new Date(startDate);
      if (endDate) query.movementDate.$lte = new Date(endDate);
    }

    if (productId) {
      query.product = productId;
    }

    if (type) {
      query.type = type;
    }

    const movements = await StockMovement.find(query)
      .populate('product', 'name sku unit')
      .populate('supplier', 'name code')
      .populate('performedBy', 'name email')
      .sort({ movementDate: -1 });

    const summary = {
      totalMovements: movements.length,
      totalIn: movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.quantity, 0),
      totalOut: movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.quantity, 0),
      totalCost: movements.reduce((sum, m) => sum + (m.totalCost || 0), 0)
    };

    res.json({
      success: true,
      data: {
        movements,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get client sales report
// @route   GET /api/reports/client-sales
// @access  Private
exports.getClientSalesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { status: { $in: ['paid', 'partial'] } };

    if (startDate || endDate) {
      matchStage.invoiceDate = {};
      if (startDate) matchStage.invoiceDate.$gte = new Date(startDate);
      if (endDate) matchStage.invoiceDate.$lte = new Date(endDate);
    }

    const clientSales = await Invoice.aggregate([
      { $match: matchStage },
      { $group: {
        _id: '$client',
        totalInvoices: { $sum: 1 },
        totalSales: { $sum: '$grandTotal' },
        totalPaid: { $sum: '$amountPaid' },
        totalBalance: { $sum: '$balance' }
      }},
      { $sort: { totalSales: -1 } }
    ]);

    await Client.populate(clientSales, { 
      path: '_id', 
      select: 'name code contact type'
    });

    res.json({
      success: true,
      count: clientSales.length,
      data: clientSales
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get supplier purchase report
// @route   GET /api/reports/supplier-purchase
// @access  Private
exports.getSupplierPurchaseReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const matchStage = { 
      type: 'in',
      reason: 'purchase'
    };

    if (startDate || endDate) {
      matchStage.movementDate = {};
      if (startDate) matchStage.movementDate.$gte = new Date(startDate);
      if (endDate) matchStage.movementDate.$lte = new Date(endDate);
    }

    const supplierPurchases = await StockMovement.aggregate([
      { $match: matchStage },
      { $group: {
        _id: '$supplier',
        totalPurchases: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalCost: { $sum: '$totalCost' }
      }},
      { $sort: { totalCost: -1 } }
    ]);

    await Supplier.populate(supplierPurchases, { 
      path: '_id', 
      select: 'name code contact'
    });

    res.json({
      success: true,
      count: supplierPurchases.length,
      data: supplierPurchases
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export report to Excel
// @route   GET /api/reports/export/excel/:reportType
// @access  Private
exports.exportReportToExcel = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    let data;

    switch (reportType) {
      case 'stock-valuation':
        const products = await Product.find({ isArchived: false })
          .populate('category', 'name')
          .sort({ name: 1 });

        worksheet.columns = [
          { header: 'SKU', key: 'sku', width: 15 },
          { header: 'Product Name', key: 'name', width: 30 },
          { header: 'Category', key: 'category', width: 20 },
          { header: 'Unit', key: 'unit', width: 10 },
          { header: 'Stock', key: 'stock', width: 12 },
          { header: 'Avg Cost', key: 'cost', width: 12 },
          { header: 'Total Value', key: 'value', width: 15 }
        ];

        products.forEach(product => {
          worksheet.addRow({
            sku: product.sku,
            name: product.name,
            category: product.category?.name || 'N/A',
            unit: product.unit,
            stock: product.currentStock,
            cost: product.averageCost,
            value: product.currentStock * product.averageCost
          });
        });
        break;

      case 'sales-summary':
        const invoices = await Invoice.find({ status: { $in: ['paid', 'partial'] } })
          .populate('client', 'name code')
          .sort({ invoiceDate: -1 });

        worksheet.columns = [
          { header: 'Invoice #', key: 'invoiceNumber', width: 20 },
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Client', key: 'client', width: 25 },
          { header: 'Subtotal', key: 'subtotal', width: 12 },
          { header: 'Tax', key: 'tax', width: 12 },
          { header: 'Total', key: 'total', width: 12 },
          { header: 'Paid', key: 'paid', width: 12 },
          { header: 'Balance', key: 'balance', width: 12 },
          { header: 'Status', key: 'status', width: 12 }
        ];

        invoices.forEach(invoice => {
          worksheet.addRow({
            invoiceNumber: invoice.invoiceNumber,
            date: invoice.invoiceDate.toLocaleDateString(),
            client: invoice.client?.name || 'N/A',
            subtotal: invoice.subtotal,
            tax: invoice.totalTax,
            total: invoice.grandTotal,
            paid: invoice.amountPaid,
            balance: invoice.balance,
            status: invoice.status
          });
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Export report to PDF
// @route   GET /api/reports/export/pdf/:reportType
// @access  Private
exports.exportReportToPDF = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text(`${reportType.toUpperCase().replace('-', ' ')} REPORT`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    switch (reportType) {
      case 'stock-valuation':
        const products = await Product.find({ isArchived: false })
          .populate('category', 'name')
          .sort({ name: 1 });

        doc.fontSize(12).text('Stock Valuation Report', { underline: true });
        doc.moveDown();

        let totalValue = 0;
        products.forEach(product => {
          const value = product.currentStock * product.averageCost;
          totalValue += value;
          doc.fontSize(9).text(
            `${product.sku} - ${product.name} | Stock: ${product.currentStock} ${product.unit} | Value: $${value.toFixed(2)}`
          );
        });

        doc.moveDown();
        doc.fontSize(12).text(`Total Stock Value: $${totalValue.toFixed(2)}`, { bold: true });
        break;

      case 'sales-summary':
        const invoices = await Invoice.find({ status: { $in: ['paid', 'partial'] } })
          .populate('client', 'name')
          .sort({ invoiceDate: -1 })
          .limit(50);

        doc.fontSize(12).text('Sales Summary Report', { underline: true });
        doc.moveDown();

        let totalSales = 0;
        invoices.forEach(invoice => {
          totalSales += invoice.grandTotal;
          doc.fontSize(9).text(
            `${invoice.invoiceNumber} | ${invoice.invoiceDate.toLocaleDateString()} | ${invoice.client?.name} | $${invoice.grandTotal.toFixed(2)}`
          );
        });

        doc.moveDown();
        doc.fontSize(12).text(`Total Sales: $${totalSales.toFixed(2)}`, { bold: true });
        break;

      default:
        doc.text('Invalid report type');
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
