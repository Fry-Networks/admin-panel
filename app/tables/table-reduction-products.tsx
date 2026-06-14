import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  Callout,
  NumberInput,
  TextInput,
  Flex
} from '@tremor/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Modal from 'react-modal';
import { modalStyles } from '../../lib/modal-styles';
import { webUser } from '../../lib/webusers-model';
import { Product, ProductModel } from '../../lib/products-schema';
import { useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { Reduction } from '../../lib/reductions-schema';
import { getTotalReduction } from './table-reductions';

export default function ReductionProductTable({
  products,
  reductions,
  index
}: {
  products: Product[];
  reductions: Reduction[];
  index: number;
}) {
  return (
    <div>
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Key</TableHeaderCell>
            <TableHeaderCell>Unverified rewards</TableHeaderCell>
            <TableHeaderCell>Verified rewards 1.5x</TableHeaderCell>
            <TableHeaderCell>Verified rewards 3.0x</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {products?.map((product) => (
            <TableRow key={product.wix_id}>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                <Text>{product.key}</Text>
              </TableCell>
              <TableCell>
                <Text>
                  {Math.round(
                    ((product.reward.unverified *
                      (100 - getTotalReduction(reductions, index))) /
                      100) *
                      100
                  ) / 100}
                </Text>
              </TableCell>
              <TableCell>
                <Text>{`${
                  ((Math.round(
                    (Math.round(product.reward.unverified * 100 * 1.5) / 100) *
                      (100 - getTotalReduction(reductions, index))
                  ) /
                    100) *
                    100) /
                  100
                }`}</Text>
              </TableCell>
              <TableCell>
                <Text>{`
                  ${
                    Math.round(
                      (((Math.round(product.reward.unverified * 100 * 3) /
                        100) *
                        (100 - getTotalReduction(reductions, index))) /
                        100) *
                        100
                    ) / 100
                  }`}</Text>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

