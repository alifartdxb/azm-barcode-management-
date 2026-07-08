with open('src/pages/PrintLabels.tsx', 'r') as f:
    code = f.read()

missing_a4_block = """
                              </div>

                              {/* Price Tag Column */}
                              {showPrice && (
                                <div className="shrink-0 flex items-center justify-end">
                                  {priceStyle === 'inverse' ? (
                                    <div 
                                      className="bg-black text-white font-black px-1.5 py-0.5 rounded-sm whitespace-nowrap text-center font-mono"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  ) : priceStyle === 'badge' ? (
                                    <div 
                                      className="border-2 border-black font-black px-1.5 py-0.5 whitespace-nowrap text-center font-mono"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  ) : (
                                    <div 
                                      className="font-extrabold whitespace-nowrap text-right font-mono text-black"
                                      style={{ fontSize: `${priceFontSize}pt`, lineHeight: 1 }}
                                    >
                                      <span className="text-[7pt] font-sans font-semibold mr-0.5">{currency}</span>
                                      {product.selling_price.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3. Barcode Vector element */}
                          <div className="flex flex-col items-center justify-center shrink-0 w-full overflow-hidden">
                            <Barcode 
                              value={product.barcode || product.sku}
                              format={barcodeFormat}
                              width={barcodeWidth}
                              height={barcodeHeight}
                              displayValue={false}
                              margin={0}
                            />
                            {showBarcodeText && (
                              <div 
                                className="font-mono text-center leading-none mt-0.5 text-black tracking-widest font-semibold"
                                style={{ fontSize: `${barcodeTextFontSize}pt` }}
                              >
                                {product.barcode || product.sku}
                              </div>
                            )}
                          </div>

                          {/* 4. Footer SKU Indicator */}
                          {showSku && (
                            <div className="flex justify-between items-center text-gray-400 mt-0.5 border-t border-dashed border-gray-100 pt-0.5 text-[6pt] font-mono leading-none">
                              <span>SKU: <strong className="text-black">{product.sku}</strong></span>
                              <span>MFR STICKER</span>
                            </div>
                          )}
                        </div>
"""

# Find where to inject it
import re

code = code.replace("""                                    style={{ fontSize: `${nameFontSize}pt`, lineHeight: 1.1 }}
                                  >
                                    {product.name}
                                  </div>
                                )}
                  </div>
                ))
              ) : (""", """                                    style={{ fontSize: `${nameFontSize}pt`, lineHeight: 1.1 }}
                                  >
                                    {product.name}
                                  </div>
                                )}""" + missing_a4_block + """
                ))
              ) : (""")

with open('src/pages/PrintLabels.tsx', 'w') as f:
    f.write(code)
